use tower_http::trace::TraceLayer;
use tuono_lib::middleware;

#[middleware]
pub fn trace_layer()
-> TraceLayer<tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>>
{
    TraceLayer::new_for_http()
}
