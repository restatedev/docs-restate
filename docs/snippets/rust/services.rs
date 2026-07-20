// <basic_service>
use restate_sdk::prelude::*;

#[restate_sdk::service]
trait MyService {
    async fn my_handler(greeting: String) -> Result<String, HandlerError>;
}

struct MyServiceImpl;

impl MyService for MyServiceImpl {
    async fn my_handler(
        &self,
        _ctx: Context<'_>,
        greeting: String,
    ) -> Result<String, HandlerError> {
        Ok(format!("{greeting}!"))
    }
}

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyServiceImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </basic_service>

// <virtual_object>
use restate_sdk::prelude::*;

#[restate_sdk::object]
pub trait MyObject {
    async fn my_handler(name: String) -> Result<String, HandlerError>;
    #[shared]
    async fn my_concurrent_handler(name: String) -> Result<String, HandlerError>;
}

pub struct MyObjectImpl;

impl MyObject for MyObjectImpl {
    async fn my_handler(
        &self,
        ctx: ObjectContext<'_>,
        greeting: String,
    ) -> Result<String, HandlerError> {
        Ok(format!("{} {}!", greeting, ctx.key()))
    }

    async fn my_concurrent_handler(
        &self,
        ctx: SharedObjectContext<'_>,
        greeting: String,
    ) -> Result<String, HandlerError> {
        Ok(format!("{} {}!", greeting, ctx.key()))
    }
}

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyObjectImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </virtual_object>

// <workflow>
use restate_sdk::prelude::*;

#[restate_sdk::workflow]
pub trait MyWorkflow {
    async fn run(req: String) -> Result<String, HandlerError>;
    #[shared]
    async fn interact_with_workflow() -> Result<(), HandlerError>;
}

pub struct MyWorkflowImpl;

impl MyWorkflow for MyWorkflowImpl {
    async fn run(
        &self,
        _ctx: WorkflowContext<'_>,
        req: String,
    ) -> Result<String, HandlerError> {
        // implement workflow logic here
        Ok(String::from("success"))
    }

    async fn interact_with_workflow(
        &self,
        _ctx: SharedWorkflowContext<'_>,
    ) -> Result<(), HandlerError> {
        // implement interaction logic here
        // e.g. resolve a promise that the workflow is waiting on
        Ok(())
    }
}

#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(MyWorkflowImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
// </workflow>

// <invocation_id>
use restate_sdk::prelude::*;

impl MyService for MyServiceImpl {
    async fn my_handler(
        &self,
        ctx: Context<'_>,
        name: String,
    ) -> Result<String, HandlerError> {
        let id = ctx.invocation_id();
        tracing::info!("Handling invocation {id} for {name}");
        Ok(format!("Greetings {name}"))
    }
}
// </invocation_id>
