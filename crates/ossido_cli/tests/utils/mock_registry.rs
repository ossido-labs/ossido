use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// A wiremock server standing in for both crates.io and npm. `version_check`
/// points both registry bases at a single URL via `__INTERNAL_OSSIDO_TEST`, so
/// one server serves the crates.io and npm endpoints together.
#[allow(dead_code)]
pub struct RegistryMock {
    pub server: MockServer,
    pub env_vars: Vec<(String, String)>,
}

#[allow(dead_code)]
impl RegistryMock {
    /// Start a server that reports `latest` as the newest ossido on both registries.
    pub async fn new(latest: &str) -> Self {
        Self::with_dist_tags(latest, None).await
    }

    /// Like [`RegistryMock::new`], but the npm side also carries a `beta`
    /// dist-tag (the release workflow's prerelease channel).
    pub async fn with_beta(latest: &str, beta: &str) -> Self {
        Self::with_dist_tags(latest, Some(beta)).await
    }

    async fn with_dist_tags(latest: &str, beta: Option<&str>) -> Self {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/api/v1/crates/ossido"))
            .respond_with(ResponseTemplate::new(200).set_body_raw(
                format!(
                    "{{\"crate\":{{\"max_stable_version\":\"{latest}\",\"max_version\":\"{latest}\"}}}}"
                ),
                "application/json",
            ))
            .mount(&server)
            .await;

        let dist_tags = match beta {
            Some(beta) => format!("{{\"latest\":\"{latest}\",\"beta\":\"{beta}\"}}"),
            None => format!("{{\"latest\":\"{latest}\"}}"),
        };
        Mock::given(method("GET"))
            .and(path("/@ossido-labs/ossido"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_raw(format!("{{\"dist-tags\":{dist_tags}}}"), "application/json"),
            )
            .mount(&server)
            .await;

        let env_vars = vec![("__INTERNAL_OSSIDO_TEST".to_string(), server.uri())];
        RegistryMock { server, env_vars }
    }
}
