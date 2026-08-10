use std::fs;

use assert_cmd::Command;
use clap::crate_version;
use serial_test::serial;

mod utils;

use utils::mock_github_endpoint::GitHubServerMock;
use utils::temp_ossido_project::TempOssidoProject;

#[tokio::test]
#[serial]
async fn it_creates_a_new_project_and_replace_the_versions_in_the_manifest() {
    let GitHubServerMock { env_vars, .. } = GitHubServerMock::new().await;

    let temp_project = TempOssidoProject::new();

    let project_folder = "my-project";

    let mut cmd = Command::cargo_bin("ossido").unwrap();

    cmd.arg("new")
        .arg(project_folder)
        .envs(env_vars)
        .assert()
        .success();

    let main_rs_path = temp_project
        .path()
        .join(project_folder)
        .join("src")
        .join("main.rs");

    let cargo_toml_path = temp_project.path().join(project_folder).join("Cargo.toml");
    let package_json_path = temp_project
        .path()
        .join(project_folder)
        .join("package.json");

    let main_rs_content = fs::read_to_string(main_rs_path).unwrap();
    let cargo_toml_content = fs::read_to_string(cargo_toml_path).unwrap();
    let package_json_content = fs::read_to_string(package_json_path).unwrap();

    assert_eq!(
        main_rs_content,
        "fn main() { println!(\"Hello, world!\"); }"
    );

    // The `.ossido` entry point is generated at scaffold time so the crate is
    // valid immediately (its `[[bin]]` points at `.ossido/main.rs`).
    let dot_ossido_main = temp_project
        .path()
        .join(project_folder)
        .join(".ossido")
        .join("main.rs");
    let dot_ossido_main_content =
        fs::read_to_string(&dot_ossido_main).expect(".ossido/main.rs was not generated");
    assert!(dot_ossido_main_content.contains("async fn main()"));

    let version = crate_version!();

    // The project name in both manifests is set to the target folder.
    let expected_cargo_toml_content =
        format!("[package] name = \"{project_folder}\" [dependencies] ossido = \"{version}\"");

    assert_eq!(cargo_toml_content, expected_cargo_toml_content);

    let expected_package_json_content = format!(
        "{{\"name\": \"{project_folder}\", \"dependencies\": {{ \"@ossido-labs/ossido\": \"{version}\" }}, \"devDependencies\": {{ \"@ossido-labs/ossido-eslint-plugin\": \"{version}\" }}}}"
    );

    assert_eq!(package_json_content, expected_package_json_content);
}

#[tokio::test]
#[serial]
async fn it_patches_mdx_onto_the_base_template() {
    // The mock serves the `ossido-app` base. MDX is a patch, so it composes onto
    // that base directly. (Tailwind swaps the base template instead — that
    // selection logic is unit-tested in the scaffold module.)
    let GitHubServerMock { env_vars, .. } = GitHubServerMock::new().await;

    let temp_project = TempOssidoProject::new();

    let project_folder = "with-mdx-static";

    let mut cmd = Command::cargo_bin("ossido").unwrap();

    cmd.arg("new")
        .arg(project_folder)
        .arg("--yes")
        .arg("--mdx")
        .arg("--output")
        .arg("static")
        .envs(env_vars)
        .assert()
        .success();

    let project_path = temp_project.path().join(project_folder);

    let package_json =
        fs::read_to_string(project_path.join("package.json")).expect("package.json missing");
    // MDX dep merged in (the `@ossido-labs/ossido-mdx` plugin bundles @mdx-js), existing dep
    // preserved.
    assert!(package_json.contains("\"@ossido-labs/ossido-mdx\""));
    assert!(package_json.contains("\"@ossido-labs/ossido\""));
    // MDX is a patch, not a base swap — no Tailwind deps leak in.
    assert!(!package_json.contains("tailwindcss"));

    let config = fs::read_to_string(project_path.join("ossido.config.ts"))
        .expect("ossido.config.ts missing");
    assert!(config.contains("output: 'static'"));
    assert!(config.contains("import { ossidoMdx } from '@ossido-labs/ossido-mdx/vite'"));
    assert!(config.contains("ossidoMdx()"));
}

#[tokio::test]
#[serial]
async fn it_scaffolds_the_base_template_unchanged_with_no_features() {
    let GitHubServerMock { env_vars, .. } = GitHubServerMock::new().await;

    let temp_project = TempOssidoProject::new();

    let project_folder = "plain";

    let mut cmd = Command::cargo_bin("ossido").unwrap();

    cmd.arg("new")
        .arg(project_folder)
        .arg("--yes")
        .envs(env_vars)
        .assert()
        .success();

    let project_path = temp_project.path().join(project_folder);

    // No feature deps added; the template's package.json keeps its exact shape
    // (only the workspace version and the project name are rewritten).
    let package_json =
        fs::read_to_string(project_path.join("package.json")).expect("package.json missing");
    let version = crate_version!();
    assert_eq!(
        package_json,
        format!(
            "{{\"name\": \"{project_folder}\", \"dependencies\": {{ \"@ossido-labs/ossido\": \"{version}\" }}, \"devDependencies\": {{ \"@ossido-labs/ossido-eslint-plugin\": \"{version}\" }}}}"
        )
    );

    // No Tailwind, so global.css is untouched (no prepended import).
    let global_css = fs::read_to_string(project_path.join("src").join("styles").join("global.css"))
        .expect("global.css missing");
    assert!(!global_css.contains("@import 'tailwindcss'"));
}

#[tokio::test]
#[serial]
async fn it_reports_an_actionable_error_when_the_version_tag_is_missing() {
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    let server = MockServer::start().await;
    let version = crate_version!();

    // Emulate an unpublished version: the tag ref lookup 404s.
    Mock::given(method("GET"))
        .and(path(format!(
            "repos/ossido-labs/ossido/git/ref/tags/v{version}"
        )))
        .respond_with(
            ResponseTemplate::new(404)
                .set_body_raw(r#"{ "message": "Not Found" }"#, "application/json"),
        )
        .mount(&server)
        .await;

    let _temp_project = TempOssidoProject::new();

    let assert = Command::cargo_bin("ossido")
        .unwrap()
        .arg("new")
        .arg("boom")
        .env("__INTERNAL_OSSIDO_TEST", server.uri())
        .assert()
        .failure();

    let stderr = String::from_utf8_lossy(&assert.get_output().stderr).to_string();
    // The error names the version and points at the `--head` escape hatch, rather
    // than the opaque "Failed to parse the tag response".
    assert!(
        stderr.contains(&format!("v{version}")) && stderr.contains("--head"),
        "unexpected stderr: {stderr}"
    );
}
