import * as clients from "@restatedev/restate-sdk-clients";
import * as restate from "@restatedev/restate-sdk";
import { MyService, MyWorkflow } from "./utils";

// A custom serde that uses msgpack or another binary format.
// Replace with your actual serde implementation.
declare const myCustomSerde: restate.Serde<unknown>;
declare const myOverrideSerde: restate.Serde<unknown>;
declare const id: string;
declare const payload: unknown;

// <start_connect_serde>
const rs = clients.connect({
  url: "http://localhost:8080",
  // Applied to all calls on this connection when no per-call serde is given.
  serde: myCustomSerde,
});
// <end_connect_serde>

const connectAndCall = async () => {
  // <start_per_call_override>
  // Per-call serde always takes precedence over the connection default.
  const response = await rs
    .serviceClient<MyService>({ name: "MyService" })
    .greet(
      { greeting: "Hi" },
      clients.rpc.opts({ input: myOverrideSerde, output: myOverrideSerde })
    );
  // <end_per_call_override>
};

const resolveAndResult = async () => {
  const handle = await rs
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "wf-id")
    .workflowSubmit({ greeting: "Hi" });

  // <start_awakeable_serde>
  // Override serde for a specific awakeable resolution.
  await rs.resolveAwakeable(id, payload, myOverrideSerde);
  // <end_awakeable_serde>

  // <start_result_serde>
  // Override serde when retrieving a result.
  const value = await rs.result(handle, myOverrideSerde);
  // <end_result_serde>
};
