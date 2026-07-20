// <tracing_subscriber>
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    HttpServer::new(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </tracing_subscriber>

// <replay_aware>
use restate_sdk::filter::ReplayAwareFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // ReplayAwareFilter suppresses log output while a handler is replaying,
    // avoiding duplicate log lines on retries.
    tracing_subscriber::registry()
        .with(ReplayAwareFilter)
        .with(tracing_subscriber::fmt::layer())
        .init();

    HttpServer::new(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </replay_aware>

// <invocation_id_log>
use restate_sdk::prelude::*;

impl MyService for MyServiceImpl {
    async fn my_handler(
        &self,
        ctx: Context<'_>,
        name: String,
    ) -> Result<String, HandlerError> {
        let id = ctx.invocation_id();
        tracing::info!(invocation_id = id, "Handling request for {name}");
        Ok(format!("Greetings {name}"))
    }
}
// </invocation_id_log>
