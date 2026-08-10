use ossido::Request;
use serde::Deserialize;

#[derive(Deserialize)]
struct Payload {
    data: String,
}

#[ossido::api(POST)]
async fn health_check(req: Request) -> String {
    req.body::<Payload>().unwrap().data
}
