use assert_cmd::Command;
use serial_test::serial;

mod utils;

use utils::mock_registry::RegistryMock;
use utils::temp_ossido_project::TempOssidoProject;

fn seed_project(cargo_version: &str, npm_version: &str) -> TempOssidoProject {
    let project = TempOssidoProject::new();
    project.add_file_with_content(
        "./Cargo.toml",
        &format!("[dependencies]\nossido = \"{cargo_version}\"\n"),
    );
    project.add_file_with_content(
        "./package.json",
        &format!("{{ \"dependencies\": {{ \"@ossido-labs/ossido\": \"{npm_version}\" }} }}"),
    );
    project
}

#[tokio::test]
#[serial]
async fn fails_and_explains_outside_a_project() {
    let _project = TempOssidoProject::new_with_no_config();

    let assert = Command::cargo_bin("ossido")
        .unwrap()
        .args(["doctor", "--offline"])
        .env("NO_COLOR", "1")
        .assert()
        .failure();

    let stdout = String::from_utf8_lossy(&assert.get_output().stdout);
    assert!(stdout.contains("not inside a ossido project"), "{stdout}");
}

#[tokio::test]
#[serial]
async fn reports_matching_versions() {
    let _project = seed_project("0.1.4", "0.1.4");

    let assert = Command::cargo_bin("ossido")
        .unwrap()
        .args(["doctor", "--offline"])
        .env("NO_COLOR", "1")
        .assert();

    let stdout = String::from_utf8_lossy(&assert.get_output().stdout);
    assert!(stdout.contains("crate and npm both on 0.1.4"), "{stdout}");
}

#[tokio::test]
#[serial]
async fn warns_on_version_mismatch() {
    let _project = seed_project("0.1.4", "0.1.3");

    let assert = Command::cargo_bin("ossido")
        .unwrap()
        .args(["doctor", "--offline"])
        .env("NO_COLOR", "1")
        .assert();

    let stdout = String::from_utf8_lossy(&assert.get_output().stdout);
    assert!(
        stdout.contains("crate is 0.1.4 but @ossido-labs/ossido is 0.1.3"),
        "{stdout}"
    );
}

#[tokio::test]
#[serial]
async fn reports_available_upgrade_from_registry() {
    let RegistryMock { env_vars, .. } = RegistryMock::new("0.9.9").await;
    let _project = seed_project("0.1.4", "0.1.4");

    let assert = Command::cargo_bin("ossido")
        .unwrap()
        .arg("doctor")
        .env("NO_COLOR", "1")
        .envs(env_vars)
        .assert();

    let stdout = String::from_utf8_lossy(&assert.get_output().stdout);
    assert!(stdout.contains("0.9.9 available"), "{stdout}");
}
