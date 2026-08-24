//! Opt-in OpenTelemetry traces + logs (the `telemetry` cargo feature).
//!
//! Enabled at runtime purely by the standard `OTEL_*` environment variables —
//! there is no ossido-specific configuration. Telemetry turns on when an OTLP
//! endpoint is configured (`OTEL_EXPORTER_OTLP_ENDPOINT` or a signal-specific
//! variant) and `OTEL_SDK_DISABLED` is not `"true"`. Endpoint, headers and
//! timeout are read by the exporter builders; `OTEL_SERVICE_NAME` /
//! `OTEL_RESOURCE_ATTRIBUTES` by the resource builder's env detectors.
//!
//! Transport is OTLP over http/protobuf only (no tonic/gRPC), exported through
//! a blocking reqwest client on the SDK's own batch threads — nothing runs on
//! the tokio runtime. Because constructing a `reqwest::blocking::Client`
//! panics from within a tokio runtime context, provider construction and
//! shutdown both run on a scratch OS thread.

mod console_layer;
mod log_bridge;

use std::sync::OnceLock;

use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::{Protocol, WithExportConfig, WithHttpConfig};
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::logs::SdkLoggerProvider;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::trace::{Sampler, SdkTracerProvider};
use ossido_internal::log::{self, Level};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Layer};

struct Providers {
    tracer: SdkTracerProvider,
    logger: SdkLoggerProvider,
}

static PROVIDERS: OnceLock<Providers> = OnceLock::new();

/// Whether OpenTelemetry export is active for this process.
pub(crate) fn enabled() -> bool {
    PROVIDERS.get().is_some()
}

/// Whether the `OTEL_*` environment opts this process into telemetry.
fn env_enabled() -> bool {
    if std::env::var("OTEL_SDK_DISABLED").is_ok_and(|value| value.eq_ignore_ascii_case("true")) {
        return false;
    }
    [
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    ]
    .iter()
    .any(|key| std::env::var_os(key).is_some_and(|value| !value.is_empty()))
}

/// `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` per the SDK env spec.
/// Unknown samplers (e.g. the `jaeger_remote` family) fall back to the spec
/// default with a warning.
fn sampler_from_env() -> Sampler {
    let name = match std::env::var("OTEL_TRACES_SAMPLER") {
        Ok(name) if !name.is_empty() => name,
        _ => return Sampler::ParentBased(Box::new(Sampler::AlwaysOn)),
    };
    let ratio = || {
        std::env::var("OTEL_TRACES_SAMPLER_ARG")
            .ok()
            .and_then(|arg| arg.parse::<f64>().ok())
            .unwrap_or(1.0)
    };
    match name.as_str() {
        "always_on" => Sampler::AlwaysOn,
        "always_off" => Sampler::AlwaysOff,
        "traceidratio" => Sampler::TraceIdRatioBased(ratio()),
        "parentbased_always_on" => Sampler::ParentBased(Box::new(Sampler::AlwaysOn)),
        "parentbased_always_off" => Sampler::ParentBased(Box::new(Sampler::AlwaysOff)),
        "parentbased_traceidratio" => {
            Sampler::ParentBased(Box::new(Sampler::TraceIdRatioBased(ratio())))
        }
        other => {
            log::backend(
                Level::Warn,
                format!("Unsupported OTEL_TRACES_SAMPLER {other:?} — using parentbased_always_on"),
            );
            Sampler::ParentBased(Box::new(Sampler::AlwaysOn))
        }
    }
}

fn resource() -> Resource {
    // The builder's env detectors handle `OTEL_SERVICE_NAME` and
    // `OTEL_RESOURCE_ATTRIBUTES`; only fall back to "ossido" when neither
    // names the service (the SDK default would be `unknown_service`).
    let service_named_by_env = std::env::var("OTEL_SERVICE_NAME")
        .is_ok_and(|name| !name.is_empty())
        || std::env::var("OTEL_RESOURCE_ATTRIBUTES")
            .is_ok_and(|attrs| attrs.contains("service.name="));

    let builder = Resource::builder();
    if service_named_by_env {
        builder.build()
    } else {
        builder.with_service_name("ossido").build()
    }
}

fn build_providers() -> Result<Providers, String> {
    // One blocking client shared by both exporters, built explicitly so the
    // TLS backend is the crate's native-tls reqwest — not an artifact of
    // feature unification inside the exporter's default client path.
    let http_client = reqwest::blocking::Client::new();

    let span_exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_protocol(Protocol::HttpBinary)
        .with_http_client(http_client.clone())
        .build()
        .map_err(|error| format!("traces exporter: {error}"))?;

    let log_exporter = opentelemetry_otlp::LogExporter::builder()
        .with_http()
        .with_protocol(Protocol::HttpBinary)
        .with_http_client(http_client)
        .build()
        .map_err(|error| format!("logs exporter: {error}"))?;

    let resource = resource();

    let tracer = SdkTracerProvider::builder()
        .with_batch_exporter(span_exporter)
        .with_sampler(sampler_from_env())
        .with_resource(resource.clone())
        .build();

    let logger = SdkLoggerProvider::builder()
        .with_batch_exporter(log_exporter)
        .with_resource(resource)
        .build();

    Ok(Providers { tracer, logger })
}

/// Initialise OpenTelemetry when the environment opts in. Called once from
/// `Server::init`; a no-op otherwise.
pub(crate) fn init() {
    if !env_enabled() || PROVIDERS.get().is_some() {
        return;
    }

    if let Ok(protocol) = std::env::var("OTEL_EXPORTER_OTLP_PROTOCOL")
        && protocol != "http/protobuf"
    {
        log::backend(
            Level::Warn,
            format!(
                "OTEL_EXPORTER_OTLP_PROTOCOL={protocol} is not supported — ossido exports OTLP over http/protobuf only"
            ),
        );
    }

    // `reqwest::blocking::Client` construction panics inside a tokio runtime
    // context, and `Server::init` is async — build on a scratch thread.
    let providers = std::thread::spawn(build_providers)
        .join()
        .unwrap_or_else(|_| Err("provider construction panicked".to_string()));
    let providers = match providers {
        Ok(providers) => providers,
        Err(error) => {
            log::backend(
                Level::Error,
                format!("Failed to initialise OpenTelemetry exporters: {error}"),
            );
            return;
        }
    };

    opentelemetry::global::set_text_map_propagator(TraceContextPropagator::new());

    // The OTel layer exports spans only: events are excluded so a log line is
    // not duplicated as both a span event and an OTLP log record (the log
    // record path below covers them, with trace correlation).
    let span_layer = tracing_opentelemetry::layer()
        .with_tracer(providers.tracer.tracer("ossido"))
        .with_filter(tracing_subscriber::filter::filter_fn(|metadata| {
            metadata.is_span()
        }));

    // `tracing` events (e.g. user `tracing::info!`) are printed through the
    // ossido logger — which also forwards them to the OTLP log sink — so one
    // event reaches console + OTLP without a second bridge. `RUST_LOG` gates
    // this layer only (spans always export); the SDK's own internal events are
    // capped at warn to keep export chatter out while surfacing failures.
    let console_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"))
        .add_directive("opentelemetry=warn".parse().expect("valid directive"));
    let console_layer = console_layer::ConsoleEventLayer.with_filter(console_filter);

    if tracing_subscriber::registry()
        .with(span_layer)
        .with(console_layer)
        .try_init()
        .is_err()
    {
        // A user-installed global subscriber wins: logs still export through
        // the sink below, but user `tracing` spans will not reach OTLP.
        log::backend(
            Level::Warn,
            "A global tracing subscriber is already set — OpenTelemetry spans from `tracing` will not be exported",
        );
    }

    log::set_sink(Box::new(log_bridge::OtelLogSink::new(&providers.logger)));

    let _ = PROVIDERS.set(providers);
}

/// Build the server span for an incoming request (entered by the
/// `LoggerLayer`), following the OTel HTTP semantic conventions. Returns a
/// disabled span when telemetry is off or the path is an internal endpoint.
pub(crate) fn request_span<B>(req: &http::Request<B>) -> tracing::Span {
    if !enabled() {
        return tracing::Span::none();
    }

    let path = req.uri().path();
    // Internal noise, mirroring the LoggerLayer's log-skip rules: the
    // browser-log intake is never traced; the data endpoint (client-side
    // navigation) only under DEBUG.
    if path.starts_with(crate::server::BROWSER_LOGS_PATH)
        || (path.starts_with(crate::server::DATA_PATH_PREFIX) && !log::debug_enabled())
    {
        return tracing::Span::none();
    }

    let method = req.method().as_str();
    // `Router::layer` middleware runs after routing, so the matched route
    // template is available; the static-file/`catch_all` fallback has none —
    // the span is then named by method only, per semconv.
    let route = req
        .extensions()
        .get::<axum::extract::MatchedPath>()
        .map(|matched| matched.as_str());
    let name = match route {
        Some(route) => format!("{method} {route}"),
        None => method.to_owned(),
    };
    let host = req
        .headers()
        .get(http::header::HOST)
        .and_then(|value| value.to_str().ok());
    let (server_address, server_port) = match host {
        Some(host) => match host
            .rsplit_once(':')
            .map(|(address, port)| (address, port.parse::<u16>()))
        {
            Some((address, Ok(port))) => (Some(address), Some(port)),
            _ => (Some(host), None),
        },
        None => (None, None),
    };
    let user_agent = req
        .headers()
        .get(http::header::USER_AGENT)
        .and_then(|value| value.to_str().ok());

    let span = tracing::info_span!(
        "request",
        { "otel.name" } = %name,
        { "otel.kind" } = "server",
        { "http.request.method" } = method,
        { "http.route" } = route,
        { "url.path" } = path,
        { "url.query" } = req.uri().query(),
        { "server.address" } = server_address,
        { "server.port" } = server_port,
        { "user_agent.original" } = user_agent,
        { "http.response.status_code" } = tracing::field::Empty,
        { "otel.status_code" } = tracing::field::Empty,
    );

    // Continue a caller's W3C trace (`traceparent`/`tracestate`) when present;
    // with no (valid) incoming context the span stays a root span.
    use tracing_opentelemetry::OpenTelemetrySpanExt;
    let parent = opentelemetry::global::get_text_map_propagator(|propagator| {
        propagator.extract(&opentelemetry_http::HeaderExtractor(req.headers()))
    });
    let _ = span.set_parent(parent);

    span
}

/// Drain the batch queues without shutting the providers down. Exists for the
/// integration tests, which need exports to be deterministic instead of
/// waiting out the batch schedule delay.
pub(crate) fn force_flush() {
    if PROVIDERS.get().is_none() {
        return;
    }
    // The blocking-reqwest export path must not run on the tokio runtime.
    let _ = std::thread::spawn(|| {
        let Some(providers) = PROVIDERS.get() else {
            return;
        };
        let _ = providers.tracer.force_flush();
        let _ = providers.logger.force_flush();
    })
    .join();
}

/// Flush and shut down the providers (drains the batch queues). Called on
/// server shutdown; a no-op when telemetry never initialised.
pub(crate) fn shutdown() {
    if PROVIDERS.get().is_none() {
        return;
    }
    // The blocking-reqwest export path must not run on the tokio runtime.
    let _ = std::thread::spawn(|| {
        let Some(providers) = PROVIDERS.get() else {
            return;
        };
        if let Err(error) = providers.tracer.shutdown() {
            log::backend(Level::Warn, format!("OTel trace shutdown: {error}"));
        }
        if let Err(error) = providers.logger.shutdown() {
            log::backend(Level::Warn, format!("OTel logs shutdown: {error}"));
        }
    })
    .join();
}

#[cfg(test)]
mod tests {
    use serial_test::serial;

    use super::*;

    const ENV_KEYS: [&str; 5] = [
        "OTEL_SDK_DISABLED",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
        "OTEL_TRACES_SAMPLER",
    ];

    /// Run `test` with exactly `vars` present out of the OTel-relevant env
    /// vars. Serialised (env is process-global); restores a clean slate.
    fn with_env(vars: &[(&str, &str)], test: impl FnOnce()) {
        for key in ENV_KEYS {
            unsafe { std::env::remove_var(key) };
        }
        for (key, value) in vars {
            unsafe { std::env::set_var(key, value) };
        }
        test();
        for key in ENV_KEYS {
            unsafe { std::env::remove_var(key) };
        }
    }

    #[test]
    #[serial(otel_env)]
    fn disabled_without_any_endpoint() {
        with_env(&[], || assert!(!env_enabled()));
    }

    #[test]
    #[serial(otel_env)]
    fn any_otlp_endpoint_variant_opts_in() {
        for key in [
            "OTEL_EXPORTER_OTLP_ENDPOINT",
            "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
            "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
        ] {
            with_env(&[(key, "http://localhost:4318")], || {
                assert!(env_enabled(), "{key} should enable telemetry");
            });
        }
    }

    #[test]
    #[serial(otel_env)]
    fn an_empty_endpoint_does_not_opt_in() {
        with_env(&[("OTEL_EXPORTER_OTLP_ENDPOINT", "")], || {
            assert!(!env_enabled());
        });
    }

    #[test]
    #[serial(otel_env)]
    fn otel_sdk_disabled_wins_over_an_endpoint() {
        with_env(
            &[
                ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
                ("OTEL_SDK_DISABLED", "true"),
            ],
            || assert!(!env_enabled()),
        );
        // Case-insensitive, per the spec's boolean env var rules.
        with_env(
            &[
                ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
                ("OTEL_SDK_DISABLED", "TRUE"),
            ],
            || assert!(!env_enabled()),
        );
        // Any other value does not disable.
        with_env(
            &[
                ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
                ("OTEL_SDK_DISABLED", "false"),
            ],
            || assert!(env_enabled()),
        );
    }

    #[test]
    #[serial(otel_env)]
    fn samplers_parse_from_the_env() {
        // (`ParentBased` boxes a `dyn ShouldSample`, so the inner sampler is
        // not matchable — variant-level asserts only.)
        with_env(&[], || {
            assert!(matches!(sampler_from_env(), Sampler::ParentBased(_)));
        });
        with_env(&[("OTEL_TRACES_SAMPLER", "always_off")], || {
            assert!(matches!(sampler_from_env(), Sampler::AlwaysOff));
        });
        with_env(
            &[
                ("OTEL_TRACES_SAMPLER", "traceidratio"),
                ("OTEL_TRACES_SAMPLER_ARG", "0.25"),
            ],
            || {
                assert!(
                    matches!(sampler_from_env(), Sampler::TraceIdRatioBased(ratio) if ratio == 0.25)
                );
            },
        );
        // Unknown samplers fall back to the spec default.
        with_env(&[("OTEL_TRACES_SAMPLER", "jaeger_remote")], || {
            assert!(matches!(sampler_from_env(), Sampler::ParentBased(_)));
        });
    }
}
