// <side_effect>
use restate_sdk::prelude::*;

async fn my_handler(&self, ctx: Context<'_>, _: ()) -> Result<String, HandlerError> {
    let result = ctx
        .run(|| async move { do_db_request().await })
        .await?;
    Ok(result)
}
// </side_effect>

// <side_effect_retry>
use restate_sdk::prelude::*;
use std::time::Duration;

async fn my_handler(&self, ctx: Context<'_>, _: ()) -> Result<String, HandlerError> {
    let result = ctx
        .run(|| async move { do_db_request().await })
        .retry_policy(
            RunRetryPolicy::default()
                // After 10 seconds, stop retrying
                .max_duration(Duration::from_secs(10))
                // On the first retry, wait 100ms before next attempt
                .initial_interval(Duration::from_millis(100))
                // Grow retry interval with factor 2
                .factor(2.0),
        )
        .await?;
    Ok(result)
}
// </side_effect_retry>

// <uuid>
use restate_sdk::prelude::*;

async fn my_handler(&self, ctx: Context<'_>, _: ()) -> Result<(), HandlerError> {
    let uuid = ctx.rand_uuid();
    // Use uuid as idempotency key etc.
    Ok(())
}
// </uuid>

// <random_nb>
use restate_sdk::prelude::*;
use rand::RngExt;

async fn my_handler(&self, ctx: Context<'_>, _: ()) -> Result<(), HandlerError> {
    let random_number = ctx.rand().random::<u64>();
    let random_in_range = ctx.rand().random_range(0..100);
    Ok(())
}
// </random_nb>
