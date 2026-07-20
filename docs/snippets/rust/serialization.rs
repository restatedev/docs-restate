// <schemars>
// In Cargo.toml:
// restate-sdk = { version = "0.10", features = ["schemars"] }
// schemars = "1"
// serde = { version = "1", features = ["derive"] }

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// Adding JsonSchema generates a JSON Schema for this type,
// which appears in OpenAPI output and the Restate Playground.
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct OrderRequest {
    pub order_id: String,
    pub amount: f64,
}

#[restate_sdk::service]
trait OrderService {
    async fn place_order(req: OrderRequest) -> Result<String, HandlerError>;
}
// </schemars>
