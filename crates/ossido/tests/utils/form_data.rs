use ossido::Request;
use serde::Deserialize;

#[derive(Deserialize)]
struct Payload {
    data: String,
}

#[ossido::api(POST)]
async fn form_data(req: Request) -> String {
    let form = req.form_data::<Payload>().unwrap();
    form.data
}
