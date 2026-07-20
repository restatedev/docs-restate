// <get>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: ObjectContext<'_>,
    _: (),
) -> Result<(), HandlerError> {
    let my_string: Option<String> = ctx.get("my-string-key").await?;
    let my_string = my_string.unwrap_or_else(|| "my-default".to_string());

    let my_number: Option<i64> = ctx.get("my-number-key").await?;
    let my_number = my_number.unwrap_or(0);

    Ok(())
}
// </get>

// <set>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: ObjectContext<'_>,
    _: (),
) -> Result<(), HandlerError> {
    ctx.set("my-key", "my-new-value".to_string());
    Ok(())
}
// </set>

// <clear>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: ObjectContext<'_>,
    _: (),
) -> Result<(), HandlerError> {
    ctx.clear("my-key");
    Ok(())
}
// </clear>

// <clear_all>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: ObjectContext<'_>,
    _: (),
) -> Result<(), HandlerError> {
    ctx.clear_all();
    Ok(())
}
// </clear_all>

// <statekeys>
use restate_sdk::prelude::*;

async fn my_handler(
    &self,
    ctx: ObjectContext<'_>,
    _: (),
) -> Result<(), HandlerError> {
    let keys: Vec<String> = ctx.get_keys().await?;
    Ok(())
}
// </statekeys>

// <lazy_state>
use restate_sdk::prelude::*;

#[restate_sdk::object]
pub trait MyObject {
    // Enable lazy state loading for this specific handler
    #[lazy_state]
    async fn my_handler(name: String) -> Result<String, HandlerError>;
}
// </lazy_state>
