// Copyright (c) 2023-2026 - Restate Software, Inc., Restate GmbH
//
// This file is part of the Restate SDK for Node.js/TypeScript,
// which is released under the MIT license.
//
// You can find a copy of the license in file LICENSE in the root
// directory of this repository or package, or at
// https://github.com/restatedev/sdk-typescript/blob/main/LICENSE

import * as clients from "@restatedev/restate-sdk-clients";
import * as restate from "@restatedev/restate-sdk";
import type { MyService, MyWorkflow } from "./types";

// <start_connect_with_serde>
// Pass a default serde when connecting — it applies to all operations
// on this client unless a per-call override is provided.
const restateClient = clients.connect({
  url: "http://localhost:8080",
  serde: myCustomSerde,
});
// </end_connect_with_serde>

// <start_per_call_override>
// Per-call overrides still take precedence over the connection default.
const result = await restateClient
  .serviceClient<MyService>({ name: "MyService" })
  .myHandler(input, clients.rpc.opts({ output: anotherSerde }));
// </end_per_call_override>

// <start_awakeable_serde>
// You can also pass a serde when resolving an awakeable.
// The connection default is used if no serde is passed here.
await restateClient.resolveAwakeable(awakeableId, payload);

// Or override the serde for this specific call:
await restateClient.resolveAwakeable(awakeableId, payload, myCustomSerde);
// </end_awakeable_serde>

// <start_result_serde>
// Retrieve the result of an invocation or workflow.
// The connection default serde is used unless you override it here.
const handle = await restateClient
  .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "wf-id")
  .workflowSubmit(input);

const output = await restateClient.result(handle);

// Or override the serde for this specific call:
const outputWithCustomSerde = await restateClient.result(handle, myCustomSerde);
// </end_result_serde>
