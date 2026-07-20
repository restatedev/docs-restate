// <sleep>
use restate_sdk::prelude::*;
use std::time::Duration;

async fn my_handler(
    &self,
    ctx: Context<'_>,
    _: (),
) -> Result<(), HandlerError> {
    ctx.sleep(Duration::from_secs(10)).await?;
    Ok(())
}
// </sleep>
