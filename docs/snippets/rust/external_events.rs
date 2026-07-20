// <awakeable>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: Context<'_>,
    _: (),
) -> Result<String, HandlerError> {
    let (id, awakeable) = ctx.awakeable::<String>();

    // Send the ID to an external system
    ctx.run(|| async move {
        request_external_task(id).await
    })
    .await?;

    // Wait for the external system to resolve the awakeable
    let result = awakeable.await?;
    Ok(result)
}
// </awakeable>

// <resolve_awakeable>
use restate_sdk::prelude::*;

async fn resolve_handler(
    &self,
    ctx: Context<'_>,
    awakeable_id: String,
) -> Result<(), HandlerError> {
    ctx.resolve_awakeable(&awakeable_id, "Looks good!".to_string());
    Ok(())
}
// </resolve_awakeable>

// <reject_awakeable>
use restate_sdk::prelude::*;
use restate_sdk::errors::TerminalError;

async fn reject_handler(
    &self,
    ctx: Context<'_>,
    awakeable_id: String,
) -> Result<(), HandlerError> {
    ctx.reject_awakeable(&awakeable_id, TerminalError::new("Cannot process review"));
    Ok(())
}
// </reject_awakeable>

// <durable_promise>
use restate_sdk::prelude::*;

// In the workflow run handler: wait for a promise by name
async fn run(
    &self,
    ctx: WorkflowContext<'_>,
    document_id: String,
) -> Result<String, HandlerError> {
    // Send document for review
    ctx.run(|| async move {
        ask_review(document_id.clone()).await
    })
    .await?;

    // Wait for the promise to be resolved
    let review: String = ctx.promise("review").await?;
    Ok(review)
}

// In another workflow handler: resolve the promise
async fn submit_review(
    &self,
    ctx: SharedWorkflowContext<'_>,
    review: String,
) -> Result<(), HandlerError> {
    ctx.resolve_promise("review", review);
    Ok(())
}
// </durable_promise>
