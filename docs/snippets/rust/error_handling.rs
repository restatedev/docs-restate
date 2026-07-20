// <terminal>
use restate_sdk::prelude::*;
use restate_sdk::errors::TerminalError;

async fn my_handler(
    &self,
    _ctx: Context<'_>,
    _: (),
) -> Result<String, HandlerError> {
    // Return a terminal error to stop retries and propagate the error to the caller
    Err(TerminalError::new("Something went wrong")
        .with_code(500)
        .into())
}
// </terminal>

// <handler_result>
use restate_sdk::prelude::*;

// Any std::error::Error type is accepted - it will be converted to HandlerError
async fn my_handler(
    &self,
    _ctx: Context<'_>,
    _: (),
) -> Result<String, HandlerError> {
    // std::io::Error, anyhow::Error, etc. can all be used with ?
    let result = std::fs::read_to_string("file.txt")?;
    Ok(result)
}
// </handler_result>
