use serde::Deserialize;
use ossido_lib::Request;

#[derive(Deserialize)]
struct Payload {
    data: String,
}

#[ossido_lib::api(POST)]
async fn health_check(req: Request) -> String {
    req.body::<Payload>().unwrap().data
}
