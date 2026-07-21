import { MyService, MyObject, MyWorkflow } from "./utils";
import * as clients from "@restatedev/restate-sdk-clients";

const myPlainTSFunction = async () => {
  // <start_rpc_call_node>
  // import * as clients from "@restatedev/restate-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // To call a service
  const greet = await restateClient
    .serviceClient<MyService>({ name: "MyService" })
    .greet({ greeting: "Hi" });

  // To call an object
  const count = await restateClient
    .objectClient<MyObject>({ name: "MyObject" }, "Mary")
    .greet({ greeting: "Hi" });

  // To call a workflow
  const handle = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .workflowSubmit({ greeting: "Hi" });
  const result = await restateClient.result(handle);

  const status = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .myOtherHandler();
  // <end_rpc_call_node>
};

const myPlainTSFunction2 = async () => {
  // <start_one_way_call_node>
  // import * as clients from "@restatedev/restateClient-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // To send a message to a service
  await restateClient
    .serviceSendClient<MyService>({ name: "MyService" })
    .greet({ greeting: "Hi" });

  // To send a message to an object
  await restateClient
    .objectSendClient<MyObject>({ name: "MyObject" }, "Mary")
    .greet({ greeting: "Hi" });

  // To send a message to a workflow
  const handle = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .workflowSubmit({ greeting: "Hi" });
  // You cannot send a message to a shared handler in a workflow
  // <end_one_way_call_node>
};

const myPlainTSFunction3 = async () => {
  // <start_delayed_call_node>
  // import * as clients from "@restatedev/restate-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // To send a delayed message to a service
  await restateClient
    .serviceSendClient<MyService>({ name: "MyService" })
    .greet({ greeting: "Hi" }, clients.rpc.sendOpts({ delay: { seconds: 1 } }));

  // To send a delayed message to an object
  await restateClient
    .objectSendClient<MyObject>({ name: "MyObject" }, "Mary")
    .greet({ greeting: "Hi" }, clients.rpc.sendOpts({ delay: { seconds: 1 } }));

  // To send a delayed message to a workflow
  const handle = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .workflowSubmit(
      { greeting: "Hi" },
      clients.rpc.sendOpts({ delay: { seconds: 1 } })
    );
  // You cannot send a delayed message to a shared handler in a workflow
  // <end_delayed_call_node>
};

const scopedClient = async () => {
  const request = { greeting: "Hi" };
  // <start_scope>
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // Route a call into a named scope
  const greet = await restateClient
    .scope("tenant-123")
    .serviceClient<MyService>({ name: "MyService" })
    .greet(request);

  // Add a limit key for a hierarchical concurrency limit within the scope
  const count = await restateClient
    .scope("tenant-123")
    .objectClient<MyObject>({ name: "MyObject" }, "Mary")
    .greet(request, clients.rpc.opts({ limitKey: "premium/user42" }));

  // Fire-and-forget sends can be scoped too
  await restateClient
    .scope("tenant-123")
    .serviceSendClient<MyService>({ name: "MyService" })
    .greet(request);
  // <end_scope>
};

const clientWithAutomaticRetries = async () => {
  const request = { greeting: "Hi" };
  // <start_automatic_retries>
  const restateClient = clients.connect({
    url: "http://localhost:8080",
    retry: true,
  });

  // Retries require an idempotency key.
  await restateClient
    .serviceClient<MyService>({ name: "MyService" })
    .greet(request, clients.rpc.opts({ idempotencyKey: "request-1" }));
  // <end_automatic_retries>
};

const clientWithCustomRetries = async () => {
  // <start_custom_retries>
  const restateClient = clients.connect({
    url: "http://localhost:8080",
    retry: {
      maxAttempts: 4,
      initialInterval: 200,
      maxInterval: { seconds: 5 },
      exponentiationFactor: 2,
      shouldRetry: (failure) =>
        clients.defaultShouldRetry(failure) ||
        (failure.kind === "response" && failure.status === 409),
    },
  });
  // <end_custom_retries>
};

const servicesIdempotent = async () => {
  const request = { greeting: "Hi" };
  const restateClient = clients.connect({ url: "http://localhost:8080" });
  // <start_service_idempotent>
  await restateClient
    .serviceSendClient<MyService>({ name: "MyService" })
    .greet(request, clients.rpc.sendOpts({ idempotencyKey: "abcde" }));
  // <end_service_idempotent>
};

const servicesAttach = async () => {
  const request = { greeting: "Hi" };
  // <start_service_attach>
  // import * as clients from "@restatedev/restate-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });
  // To send a message
  const handle = await restateClient
    .serviceSendClient<MyService>({ name: "MyService" })
    .greet(request, clients.rpc.sendOpts({ idempotencyKey: "abcde" }));

  // ... do something else ...

  // Attach later to retrieve the result
  const response = await restateClient.result(handle);
  // <end_service_attach>
};

const workflowAttach = async () => {
  const request = { greeting: "Hi" };
  // <start_workflow_attach>
  // import * as clients from "@restatedev/restate-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // Option 1: attach and wait for result with workflow ID
  const result = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .workflowAttach();

  // Option 2: peek to check if ready with workflow ID
  const peekOutput = await restateClient
    .workflowClient<MyWorkflow>({ name: "MyWorkflow" }, "someone")
    .workflowOutput();
  if (peekOutput.ready) {
    const result2 = peekOutput.result;
  }
  // <end_workflow_attach>
};
