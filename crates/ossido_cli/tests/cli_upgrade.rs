use std::fs;

use assert_cmd::Command;
use serial_test::serial;

mod utils;

use utils::mock_registry::RegistryMock;
use utils::temp_ossido_project::TempOssidoProject;

const CARGO: &str = "[dependencies]\nossido = \"0.1.4\"\n";
const PACKAGE_JSON: &str = "{\n  \"dependencies\": { \"@ossido-labs/ossido\": \"0.1.4\" }\n}\n";

fn seed_project() -> TempOssidoProject {
    let project = TempOssidoProject::new();
    project.add_file_with_content("./Cargo.toml", CARGO);
    project.add_file_with_content("./package.json", PACKAGE_JSON);
    project
}

#[tokio::test]
#[serial]
async fn upgrades_both_manifests_to_explicit_version() {
    let project = seed_project();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--version", "0.2.0", "--no-install", "--yes"])
        .assert()
        .success();

    let cargo = fs::read_to_string(project.path().join("Cargo.toml")).unwrap();
    let pkg = fs::read_to_string(project.path().join("package.json")).unwrap();
    assert!(cargo.contains("ossido = \"0.2.0\""), "{cargo}");
    assert!(pkg.contains("\"@ossido-labs/ossido\": \"0.2.0\""), "{pkg}");
}

#[tokio::test]
#[serial]
async fn dry_run_leaves_files_unchanged() {
    let project = seed_project();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--version", "0.2.0", "--dry-run"])
        .assert()
        .success();

    assert_eq!(
        fs::read_to_string(project.path().join("Cargo.toml")).unwrap(),
        CARGO
    );
    assert_eq!(
        fs::read_to_string(project.path().join("package.json")).unwrap(),
        PACKAGE_JSON
    );
}

#[tokio::test]
#[serial]
async fn resolves_latest_from_registry_when_no_version_given() {
    let RegistryMock { env_vars, .. } = RegistryMock::new("0.9.9").await;
    let project = seed_project();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--no-install", "--yes"])
        .envs(env_vars)
        .assert()
        .success();

    let cargo = fs::read_to_string(project.path().join("Cargo.toml")).unwrap();
    let pkg = fs::read_to_string(project.path().join("package.json")).unwrap();
    assert!(cargo.contains("ossido = \"0.9.9\""), "{cargo}");
    assert!(pkg.contains("\"@ossido-labs/ossido\": \"0.9.9\""), "{pkg}");
}

#[tokio::test]
#[serial]
async fn include_beta_resolves_the_beta_channel() {
    let RegistryMock { env_vars, .. } =
        RegistryMock::with_beta("0.9.9", "1.0.0-beta.20260822034020Z").await;
    let project = seed_project();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--no-install", "--yes", "--include-beta"])
        .envs(env_vars)
        .assert()
        .success();

    let cargo = fs::read_to_string(project.path().join("Cargo.toml")).unwrap();
    let pkg = fs::read_to_string(project.path().join("package.json")).unwrap();
    assert!(
        cargo.contains("ossido = \"1.0.0-beta.20260822034020Z\""),
        "{cargo}"
    );
    assert!(
        pkg.contains("\"@ossido-labs/ossido\": \"1.0.0-beta.20260822034020Z\""),
        "{pkg}"
    );
}

#[tokio::test]
#[serial]
async fn betas_are_hidden_without_the_flag() {
    // The registry HAS a beta; without --include-beta the resolver must never
    // consider it.
    let RegistryMock { env_vars, .. } =
        RegistryMock::with_beta("0.9.9", "1.0.0-beta.20260822034020Z").await;
    let project = seed_project();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--no-install", "--yes"])
        .envs(env_vars)
        .assert()
        .success();

    let cargo = fs::read_to_string(project.path().join("Cargo.toml")).unwrap();
    assert!(cargo.contains("ossido = \"0.9.9\""), "{cargo}");
    assert!(!cargo.contains("beta"), "{cargo}");
}

#[tokio::test]
#[serial]
async fn fails_outside_a_project() {
    let _project = TempOssidoProject::new_with_no_config();

    Command::cargo_bin("ossido")
        .unwrap()
        .args(["upgrade", "--version", "0.2.0", "--yes"])
        .assert()
        .failure();
}
