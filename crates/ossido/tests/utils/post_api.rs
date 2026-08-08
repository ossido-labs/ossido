use serde::Deserialize;
use ossido::Request;

#[derive(Deserialize)]
struct Payload {
    data: String,
}

#[ossido::api(POST)]
async fn health_check(req: Request) -> String {
    req.body::<Payload>().unwrap().data
}
