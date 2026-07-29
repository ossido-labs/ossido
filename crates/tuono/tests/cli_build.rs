use assert_cmd::Command;
use serial_test::serial;
use std::fs;
use tracing::Level;

mod utils;
use utils::assert_contains_ignoring_whitespace;
use utils::temp_tuono_project::TempTuonoProject;

const POST_API_FILE: &str = r"#[tuono_lib::api(POST)]";
const GET_API_FILE: &str = r"#[tuono_lib::api(GET)]";
const HANDLER_FILE: &str = "#[tuono_lib::handler]\nasync fn handler(_req: tuono_lib::Request) -> tuono_lib::Response { todo!() }";

fn tracing_message(level: Level, module: &str, message: &str) -> String {
    format!("\x1b[31m{level}\x1b[0m \x1b[2mtuono::{module}\x1b[0m\x1b[2m:\x1b[0m {message}\n")
}

#[cfg(target_os = "windows")]
const BUILD_TUONO_CONFIG: &str = ".\\node_modules\\.bin\\tuono-build-config.cmd";

#[cfg(not(target_os = "windows"))]
const BUILD_TUONO_CONFIG: &str = "./node_modules/.bin/tuono-build-config";

#[test]
#[serial]
fn it_successfully_create_the_index_route() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file("./src/routes/page.rs");

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path="../src/routes/page.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod page;");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/", get(page::tuono_internal_route)).route("/__tuono/data/", get(page::tuono_internal_api))"#,
    );
}

#[test]
#[serial]
fn it_successfully_create_an_api_route() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file_with_content("./src/routes/api/health_check.rs", POST_API_FILE);

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path="../src/routes/api/health_check.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod api_health_check;");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/api/health_check", post(api_health_check::post_tuono_internal_api))"#,
    );
}

#[test]
#[serial]
fn it_successfully_create_multiple_api_for_the_same_file() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file_with_content(
        "./src/routes/api/health_check.rs",
        &format!("{POST_API_FILE}{GET_API_FILE}"),
    );

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path="../src/routes/api/health_check.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod api_health_check;");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/api/health_check", post(api_health_check::post_tuono_internal_api))"#,
    );
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/api/health_check", get(api_health_check::get_tuono_internal_api))"#,
    );
}

#[test]
#[serial]
fn it_successfully_import_mixed_case_routes() {
    let temp_tuono_project = TempTuonoProject::new();

    for method in ["get", "post", "put", "delete", "patch"] {
        temp_tuono_project.add_file_with_content(
            &format!("./src/routes/api/{method}_lower.rs"),
            &format!(r"#[tuono_lib::api({method})]"),
        );
        temp_tuono_project.add_file_with_content(
            &format!("./src/routes/api/{method}_upper.rs"),
            &format!(r"#[tuono_lib::api({})]", method.to_uppercase()),
        );
    }

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    for method in ["get", "post", "put", "delete", "patch"] {
        let expected = format!(r#"use tuono_lib::axum::routing::{method};"#);
        let imports = temp_main_rs_content.match_indices(&expected);
        assert_eq!(imports.count(), 1);
    }
}

#[test]
#[serial]
fn it_successfully_composes_layout_handlers_into_pages() {
    let temp_tuono_project = TempTuonoProject::new();

    // A root `layout.rs` wraps the `/about` page.
    temp_tuono_project.add_file_with_content("./src/routes/layout.rs", HANDLER_FILE);
    temp_tuono_project.add_file_with_content("./src/routes/about/page.rs", HANDLER_FILE);

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");
    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    // Both the layout and the page modules are imported…
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod layout;");
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod about_page;");

    // …and the page's routes are served by composites that run the layout +
    // page data handlers keyed by their route file paths.
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"("/layout".to_string(), layout::tuono_internal_props("#,
    );
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"about_page::tuono_internal_props("#,
    );
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/about", get(__tuono_ssr_about_page))"#,
    );
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/__tuono/data/about", get(__tuono_data_about_page))"#,
    );

    // The layout itself has no standalone route.
    assert!(
        !temp_main_rs_content.contains("get(layout::tuono_internal_route)"),
        "layout.rs must not get its own route"
    );
}

#[test]
#[serial]
fn it_successfully_create_catch_all_routes() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file("./src/routes/[...all_routes]/page.rs");

    temp_tuono_project.add_file_with_content("./src/routes/api/[...all_apis].rs", POST_API_FILE);

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path="../src/routes/api/[...all_apis].rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod api_dyn_catch_all_all_apis;");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path="../src/routes/[...all_routes]/page.rs"]"#,
    );
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        "mod dyn_catch_all_all_routes_page;",
    );

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/api/{*all_apis}", post(api_dyn_catch_all_all_apis::post_tuono_internal_api))"#,
    );

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/{*all_routes}", get(dyn_catch_all_all_routes_page::tuono_internal_route))"#,
    );

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#".route("/__tuono/data/{*all_routes}", get(dyn_catch_all_all_routes_page::tuono_internal_api))"#,
    );
}

#[test]
#[serial]
fn it_fails_without_installed_build_config_script() {
    let _guard = TempTuonoProject::new();

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .assert()
        .failure()
        .stderr("Failed to find the build script. Please run `npm install`\n");
}

#[test]
#[serial]
fn it_fails_without_installed_build_script() {
    let temp_tuono_project = TempTuonoProject::new();
    temp_tuono_project.add_file_with_content(BUILD_TUONO_CONFIG, "#!/bin/bash");
    Command::new("chmod")
        .arg("+x")
        .arg(BUILD_TUONO_CONFIG)
        .assert()
        .success();
    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();

    test_tuono_build
        .arg("build")
        .assert()
        .failure()
        .stderr("Failed to read config. Please run `npm install` to generate automatically.\n");
}

#[test]
#[serial]
fn dev_fails_with_no_config() {
    let _temp_tuono_project = TempTuonoProject::new_with_no_config();

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("dev")
        .assert()
        .failure()
        .stdout(tracing_message(
            Level::ERROR,
            "source_builder",
            "Cannot find tuono.config.ts - is this a tuono project?",
        ));
}

#[test]
#[serial]
fn build_fails_with_no_config() {
    let _temp_tuono_project = TempTuonoProject::new_with_no_config();

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("dev")
        .assert()
        .failure()
        .stdout(tracing_message(
            Level::ERROR,
            "source_builder",
            "Cannot find tuono.config.ts - is this a tuono project?",
        ));
}

#[test]
#[serial]
fn it_successfully_adds_middleware_to_router() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file_with_content(
        "./src/routes/middleware.rs",
        r#"use tower_http::trace::TraceLayer;

#[tuono_lib::middleware]
pub fn trace_layer() -> TraceLayer<tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>> {
    TraceLayer::new_for_http()
}"#,
    );

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path = "../src/routes/middleware.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod middleware;");
    assert_contains_ignoring_whitespace(&temp_main_rs_content, ".layer(middleware::trace_layer())");
}

#[test]
#[serial]
fn it_successfully_adds_multiple_middlewares_to_router() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file_with_content(
        "./src/routes/middleware.rs",
        r#"use tower_http::trace::TraceLayer;

#[tuono_lib::middleware]
pub fn trace_layer() -> TraceLayer<tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>> {
    TraceLayer::new_for_http()
}

#[tuono_lib::middleware]
pub fn another_middleware() -> tower_http::cors::CorsLayer {
    tower_http::cors::CorsLayer::new()
}"#,
    );

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path = "../src/routes/middleware.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod middleware;");
    assert_contains_ignoring_whitespace(&temp_main_rs_content, ".layer(middleware::trace_layer())");
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        ".layer(middleware::another_middleware())",
    );
}

#[test]
#[serial]
fn it_successfully_adds_middleware_in_subdirectory() {
    let temp_tuono_project = TempTuonoProject::new();

    temp_tuono_project.add_file_with_content(
        "./src/routes/api/middleware.rs",
        r#"#[tuono_lib::middleware]
pub fn api_middleware() -> tower_http::cors::CorsLayer {
    tower_http::cors::CorsLayer::new()
}"#,
    );

    temp_tuono_project.add_file("./src/routes/api/health.rs");

    let mut test_tuono_build = Command::cargo_bin("tuono").unwrap();
    test_tuono_build
        .arg("build")
        .arg("--no-js-emit")
        .assert()
        .success();

    let temp_main_rs_path = temp_tuono_project.path().join(".tuono/main.rs");

    let temp_main_rs_content =
        fs::read_to_string(&temp_main_rs_path).expect("Failed to read '.tuono/main.rs' content.");

    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        r#"#[path = "../src/routes/api/middleware.rs"]"#,
    );
    assert_contains_ignoring_whitespace(&temp_main_rs_content, "mod api_middleware;");
    assert_contains_ignoring_whitespace(
        &temp_main_rs_content,
        ".layer(api_middleware::api_middleware())",
    );
}
