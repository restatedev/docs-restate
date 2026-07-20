// <request_response>
use restate_sdk::prelude::*;

// Generated client from the #[restate_sdk::service] macro
let greeter_client = ctx.service_client::<GreeterClient>();
let response = greeter_client.greet("Mary".to_string()).call().await?;

// Call a Virtual Object handler
let obj_client = ctx.object_client::<MyObjectClient>("Mary");
let response = obj_client.my_handler("Hi".to_string()).call().await?;

// Call a Workflow run handler (once per workflow ID)
let wf_client = ctx.workflow_client::<MyWorkflowClient>("my-workflow-id");
let response = wf_client.run("request".to_string()).call().await?;
// </request_response>

// <one_way>
use restate_sdk::prelude::*;

// Send to a Service without waiting for response
let greeter_client = ctx.service_client::<GreeterClient>();
greeter_client.greet("Mary".to_string()).send().await?;

// Send to a Virtual Object
let obj_client = ctx.object_client::<MyObjectClient>("Mary");
obj_client.my_handler("Hi".to_string()).send().await?;
// </one_way>

// <delayed>
use restate_sdk::prelude::*;
use std::time::Duration;

// Send to a Service after a delay
let greeter_client = ctx.service_client::<GreeterClient>();
greeter_client
    .greet("Mary".to_string())
    .send_after(Duration::from_secs(5 * 3600))
    .await?;
// </delayed>

// <attach>
use restate_sdk::prelude::*;

// Send a message and get back an invocation handle
let greeter_client = ctx.service_client::<GreeterClient>();
let handle = greeter_client.greet("Mary".to_string()).send().await?;

// Later, attach to the invocation to await its result
let response = ctx.attach_invocation(handle).await?;
// </attach>

// <cancel>
use restate_sdk::prelude::*;

let greeter_client = ctx.service_client::<GreeterClient>();
let handle = greeter_client.greet("Mary".to_string()).send().await?;

// Cancel the invocation
ctx.cancel_invocation(handle).await?;
// </cancel>
