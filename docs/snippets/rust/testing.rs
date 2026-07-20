// <testcontainers>
use restate_sdk::prelude::*;
use restate_sdk_testcontainers::TestContainer;

#[tokio::test]
async fn test_my_service() {
    tracing_subscriber::fmt::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let endpoint = Endpoint::builder()
        .bind(MyServiceImpl.serve())
        .build();

    let test_container = TestContainer::builder()
        .with_container_logging()
        .build()
        .start(endpoint)
        .await
        .unwrap();

    let ingress_url = test_container.ingress_url();

    let response = reqwest::Client::new()
        .post(format!("{}/MyService/myHandler", ingress_url))
        .header("Content-Type", "application/json")
        .json(&"World")
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), 200);
}
// </testcontainers>
