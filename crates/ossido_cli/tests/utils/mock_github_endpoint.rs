use std::env;

use clap::crate_version;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[allow(dead_code)]
pub struct GitHubServerMock {
    pub server: MockServer,
    pub env_vars: Vec<(String, String)>,
}

#[allow(dead_code)]
impl GitHubServerMock {
    pub async fn new() -> Self {
        let server = MockServer::start().await;

        let ossido_version = crate_version!();

        let sha = "1234567890abcdef";

        let sha_response_template = ResponseTemplate::new(200).set_body_raw(
            format!("{{ \"object\": {{ \"sha\": \"{sha}\" }} }}"),
            "application/json",
        );

        Mock::given(method("GET"))
            .and(path(format!(
                "repos/ossido-labs/ossido/git/ref/tags/v{ossido_version}"
            )))
            .respond_with(sha_response_template)
            .mount(&server)
            .await;

        let tree_response_template = ResponseTemplate::new(200).set_body_raw(
            r#"{
            "tree": [
                {
                    "path":  "examples/ossido-app/src",
                    "type": "tree"
                },
                {
                    "path": "examples/ossido-app/src/main.rs",
                    "type": "blob"
                },
                {
                    "path": "examples/ossido-app/Cargo.toml",
                    "type": "blob"
                },
                {
                    "path": "examples/ossido-app/package.json",
                    "type": "blob"
                },
                {
                    "path": "examples/ossido-app/ossido.config.ts",
                    "type": "blob"
                },
                {
                    "path": "examples/ossido-app/src/styles",
                    "type": "tree"
                },
                {
                    "path": "examples/ossido-app/src/styles/global.css",
                    "type": "blob"
                }
            ]
            }"#,
            "application/json",
        );

        Mock::given(method("GET"))
            .and(path(format!("repos/ossido-labs/ossido/git/trees/{sha}")))
            .respond_with(tree_response_template)
            .mount(&server)
            .await;

        let file_response_template =
            |content: &str| ResponseTemplate::new(200).set_body_raw(content, "text/plain");

        Mock::given(method("GET"))
            .and(path(format!(
                "ossido-labs/ossido/v{ossido_version}/examples/ossido-app/src/main.rs"
            )))
            .respond_with(file_response_template(
                "fn main() { println!(\"Hello, world!\"); }",
            ))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!(
                "ossido-labs/ossido/v{ossido_version}/examples/ossido-app/Cargo.toml"
            )))
            .respond_with(file_response_template(
                "[package] name = \"ossido-tutorial\" [dependencies] ossido = { path = \"../../crates/ossido/\" }"
            ))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!(
                "ossido-labs/ossido/v{ossido_version}/examples/ossido-app/package.json"
            )))
            .respond_with(file_response_template(
                r#"{"name": "ossido-app", "dependencies": { "@ossido-labs/ossido": "workspace:*" }, "devDependencies": { "@ossido-labs/ossido-eslint-plugin": "workspace:*" }}"#,
            ))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!(
                "ossido-labs/ossido/v{ossido_version}/examples/ossido-app/ossido.config.ts"
            )))
            .respond_with(file_response_template(
                "import type { OssidoConfig } from '@ossido-labs/ossido/config'\n\nconst config: OssidoConfig = {}\n\nexport default config\n",
            ))
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path(format!(
                "ossido-labs/ossido/v{ossido_version}/examples/ossido-app/src/styles/global.css"
            )))
            .respond_with(file_response_template("body {\n  margin: 0;\n}\n"))
            .mount(&server)
            .await;

        let env_vars = vec![("__INTERNAL_OSSIDO_TEST".to_string(), server.uri())];
        GitHubServerMock { server, env_vars }
    }
}
