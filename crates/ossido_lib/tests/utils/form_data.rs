use serde::Deserialize;
use ossido_lib::Request;

#[derive(Deserialize)]
struct Payload {
    data: String,
}

#[ossido_lib::api(POST)]
async fn form_data(req: Request) -> String {
    let form = req.form_data::<Payload>().unwrap();
    form.data
}
