use std::env;

use ossido::Request;

#[ossido::api(GET)]
pub async fn test_env(_req: Request) -> String {
    env::var("MY_TEST_KEY").unwrap_or("error".parse().unwrap())
}
