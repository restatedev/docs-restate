// <parallel>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: Context<'_>,
    _: (),
) -> Result<(), HandlerError> {
    // Start operations concurrently without immediately awaiting them
    let call1 = ctx.run(|| async { fetch_user_data(123).await });
    let call2 = ctx.run(|| async { fetch_order_history(123).await });
    let call3 = ctx
        .service_client::<AnalyticsServiceClient>()
        .calculate_metrics(123)
        .call();

    // Await all results
    let user = call1.await?;
    let orders = call2.await?;
    let metrics = call3.await?;

    Ok(())
}
// </parallel>

// <select>
use restate_sdk::prelude::*;
use std::time::Duration;

async fn my_handler(
    &self,
    ctx: Context<'_>,
    _: (),
) -> Result<String, HandlerError> {
    let sleep = ctx.sleep(Duration::from_secs(30));
    let call = ctx
        .service_client::<MyServiceClient>()
        .my_handler("hi".to_string())
        .call();

    // Race: return whichever completes first
    restate_sdk::select! {
        result = sleep => {
            result?;
            Ok("sleep won".to_string())
        },
        result = call => {
            Ok(format!("call won with: {}", result?))
        }
    }
}
// </select>

// <durable_futures_unordered>
use restate_sdk::prelude::*;
use restate_sdk::context::DurableFuturesUnordered;
use std::time::Duration;

async fn my_handler(
    &self,
    ctx: Context<'_>,
    _: (),
) -> Result<(), HandlerError> {
    let mut futures = DurableFuturesUnordered::new();
    futures.push(ctx.sleep(Duration::from_secs(1)));
    futures.push(ctx.sleep(Duration::from_secs(2)));
    futures.push(ctx.sleep(Duration::from_secs(3)));

    // Consume results in completion order; each yields (index, result)
    while let Some((index, result)) = futures.next().await? {
        result?;
        // handle completion at `index`
    }

    Ok(())
}
// </durable_futures_unordered>
