use tower_http::trace::TraceLayer;
use ossido::middleware;

#[middleware]
pub fn trace_layer()
-> TraceLayer<tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>>
{
    TraceLayer::new_for_http()
}
