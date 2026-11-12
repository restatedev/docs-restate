#![allow(dead_code)]

use restate_sdk::prelude::*;

struct MyService;

#[restate_sdk::service]
impl MyService {
    #[handler]
    async fn handle(&self, _ctx: Context<'_>) -> Result<(), HandlerError> {
        Ok(())
    }
}

// <start_identity>
use restate_sdk::endpoint::Endpoint;
use restate_sdk::http_server::HttpServer;

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyService)
            .identity_key("publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f")
            .unwrap()
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// <end_identity>
