// <http_server>
use restate_sdk::prelude::*;

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .bind(MyObjectImpl.serve())
            .bind(MyWorkflowImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </http_server>

// <lambda>
use restate_sdk::prelude::*;

#[tokio::main]
async fn main() {
    LambdaEndpoint::run(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .bind(MyObjectImpl.serve())
            .bind(MyWorkflowImpl.serve())
            .build(),
    )
    .await
    .unwrap();
}
// </lambda>

// <identity>
use restate_sdk::prelude::*;

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .with_identity_key(
                "publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f",
            )
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </identity>

// <aws_lc_rs>
// In Cargo.toml:
// restate-sdk = { version = "0.10", default-features = false, features = ["http_server", "aws_lc_rs"] }
// </aws_lc_rs>
