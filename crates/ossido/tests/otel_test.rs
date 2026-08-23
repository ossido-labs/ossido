//! End-to-end OpenTelemetry export: boots the real server (`MockOssidoServer`
//! runs `Server::init` + `start`, so `otel::init` runs exactly as in
//! production — including inside a tokio runtime), points the OTLP env at an
//! in-test collector, and asserts on the decoded http/protobuf export bodies.
//!
//! One test function on purpose: the OTel providers, tracing subscriber and
//! log sink are process-wide singletons, so this binary is the telemetry
//! world and `server_test.rs` (a separate binary/process) stays telemetry-free.

// See tests/main.rs: the `#[handler]` macro references
// `crate::ossido_main_state::ApplicationState`.
mod ossido_main_state {
    pub type ApplicationState = ();
}

mod utils;

use std::sync::{Arc, Mutex};

use opentelemetry_proto::tonic::collector::logs::v1::ExportLogsServiceRequest;
use opentelemetry_proto::tonic::collector::trace::v1::ExportTraceServiceRequest;
use opentelemetry_proto::tonic::common::v1::any_value;
use opentelemetry_proto::tonic::trace::v1::Span;
use ossido::axum::Router;
use ossido::axum::body::Bytes;
use ossido::axum::routing::post;
use prost::Message;

use crate::utils::mock_server::MockOssidoServer;

const TRACEPARENT_TRACE_ID: &str = "0af7651916cd43dd8448eb211c80319c";
const TRACEPARENT_SPAN_ID: &str = "b7ad6b7169203331";

#[derive(Clone, Default)]
struct Collector {
    traces: Arc<Mutex<Vec<ExportTraceServiceRequest>>>,
    logs: Arc<Mutex<Vec<ExportLogsServiceRequest>>>,
}

impl Collector {
    /// All exported spans, flattened across export batches.
    fn spans(&self) -> Vec<Span> {
        self.traces
            .lock()
            .unwrap()
            .iter()
            .flat_map(|request| &request.resource_spans)
            .flat_map(|resource| &resource.scope_spans)
            .flat_map(|scope| &scope.spans)
            .cloned()
            .collect()
    }

    /// All exported log record bodies with their trace ids.
    fn log_records(&self) -> Vec<(String, Vec<u8>)> {
        self.logs
            .lock()
            .unwrap()
            .iter()
            .flat_map(|request| &request.resource_logs)
            .flat_map(|resource| &resource.scope_logs)
            .flat_map(|scope| &scope.log_records)
            .map(|record| {
                let body = match record.body.as_ref().and_then(|body| body.value.as_ref()) {
                    Some(any_value::Value::StringValue(text)) => text.clone(),
                    other => format!("{other:?}"),
                };
                (body, record.trace_id.clone())
            })
            .collect()
    }
}

async fn spawn_collector(collector: Collector) -> String {
    let traces = collector.traces.clone();
    let logs = collector.logs.clone();

    let router = Router::new()
        .route(
            "/v1/traces",
            post(move |body: Bytes| async move {
                let decoded =
                    ExportTraceServiceRequest::decode(body.as_ref()).expect("valid OTLP traces");
                traces.lock().unwrap().push(decoded);
            }),
        )
        .route(
            "/v1/logs",
            post(move |body: Bytes| async move {
                let decoded =
                    ExportLogsServiceRequest::decode(body.as_ref()).expect("valid OTLP logs");
                logs.lock().unwrap().push(decoded);
            }),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind collector");
    let address = listener.local_addr().expect("collector address");
    tokio::spawn(async move {
        ossido::axum::serve(listener, router)
            .await
            .expect("serve collector");
    });
    format!("http://{address}")
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn attribute<'a>(span: &'a Span, key: &str) -> Option<&'a any_value::Value> {
    span.attributes
        .iter()
        .find(|attribute| attribute.key == key)
        .and_then(|attribute| attribute.value.as_ref())
        .and_then(|value| value.value.as_ref())
}

fn find_span<'a>(spans: &'a [Span], name: &str) -> &'a Span {
    spans
        .iter()
        .find(|span| span.name == name)
        .unwrap_or_else(|| {
            let names: Vec<_> = spans.iter().map(|span| span.name.as_str()).collect();
            panic!("no span named {name:?}; exported spans: {names:?}")
        })
}

// Multi-threaded on purpose: `force_flush` blocks its calling thread while
// the exporter posts to the in-test collector, which runs on this same
// runtime — on the single-threaded flavor that deadlocks until the export
// timeout.
#[tokio::test(flavor = "multi_thread")]
async fn exports_request_ssr_and_handler_spans_with_correlated_logs() {
    let collector = Collector::default();
    let endpoint = spawn_collector(collector.clone()).await;

    // The standard env-var opt-in — must be set before `Server::init` runs.
    // Safe: nothing else is reading the environment yet in this process.
    unsafe { std::env::set_var("OTEL_EXPORTER_OTLP_ENDPOINT", &endpoint) };

    let app = MockOssidoServer::spawn().await;
    let server_url = format!("http://{}:{}", app.address, app.port);
    let client = reqwest::Client::new();

    // An API request continuing an upstream W3C trace context.
    let response = client
        .get(format!("{server_url}/dynamic/url_parameter"))
        .header(
            "traceparent",
            format!("00-{TRACEPARENT_TRACE_ID}-{TRACEPARENT_SPAN_ID}-01"),
        )
        .send()
        .await
        .expect("api request");
    assert!(response.status().is_success());

    // An SSR page request (streaming render on the pool threads).
    let response = client
        .get(format!("{server_url}/"))
        .send()
        .await
        .expect("ssr request");
    assert!(response.status().is_success());
    let body = response.text().await.expect("ssr body");
    assert!(body.starts_with("<!DOCTYPE html>"));

    // Drain the batch exporters so the asserts below are deterministic.
    ossido::__otel::force_flush();

    let spans = collector.spans();

    // — API request: server span, semconv attributes, remote parent. —
    let server_span = find_span(&spans, "GET /dynamic/{parameter}");
    assert_eq!(
        server_span.kind,
        opentelemetry_proto::tonic::trace::v1::span::SpanKind::Server as i32
    );
    assert_eq!(hex(&server_span.trace_id), TRACEPARENT_TRACE_ID);
    assert_eq!(hex(&server_span.parent_span_id), TRACEPARENT_SPAN_ID);
    assert_eq!(
        attribute(server_span, "http.route"),
        Some(&any_value::Value::StringValue(
            "/dynamic/{parameter}".to_string()
        ))
    );
    assert_eq!(
        attribute(server_span, "url.path"),
        Some(&any_value::Value::StringValue(
            "/dynamic/url_parameter".to_string()
        ))
    );
    assert_eq!(
        attribute(server_span, "http.request.method"),
        Some(&any_value::Value::StringValue("GET".to_string()))
    );
    assert_eq!(
        attribute(server_span, "http.response.status_code"),
        Some(&any_value::Value::IntValue(200))
    );

    // — The `#[api]` macro's handler span, child of the server span. —
    let handler_span = find_span(&spans, "read_dynamic_parameter");
    assert_eq!(hex(&handler_span.trace_id), TRACEPARENT_TRACE_ID);
    assert_eq!(handler_span.parent_span_id, server_span.span_id);

    // — SSR page request: render-pool spans nested under its server span. —
    let page_span = find_span(&spans, "GET /");
    let render_span = find_span(&spans, "ssr.render_job");
    assert_eq!(render_span.trace_id, page_span.trace_id);
    let queue_span = find_span(&spans, "ssr.queue_wait");
    assert_eq!(queue_span.trace_id, page_span.trace_id);
    // The phase spans from `debug::time` on the pool thread nest under the
    // render job.
    let phase_span = find_span(&spans, "ssr.render");
    assert_eq!(phase_span.parent_span_id, render_span.span_id);

    // — Logs: the request summary is exported and trace-correlated. —
    let records = collector.log_records();
    let (body, trace_id) = records
        .iter()
        .find(|(body, _)| body.contains("GET /dynamic/url_parameter"))
        .unwrap_or_else(|| {
            let bodies: Vec<_> = records.iter().map(|(body, _)| body.as_str()).collect();
            panic!("no request-summary log record; exported records: {bodies:?}")
        });
    assert_eq!(hex(trace_id), TRACEPARENT_TRACE_ID);
    // The console message is colourised; the exported body must not carry
    // ANSI escapes.
    assert!(!body.contains('\u{1b}'));
}
