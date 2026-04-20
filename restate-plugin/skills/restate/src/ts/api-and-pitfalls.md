# TypeScript SDK Reference: API and Pitfalls

## Setup

### Install Restate Server

Ask the user for preferred installation method:

**npx (quick, no install):**
```bash
npx @restatedev/restate-server
```

**Homebrew:**
```bash
brew install restatedev/tap/restate-server
```

**Docker:**
```bash
docker run --name restate_dev --rm -p 8080:8080 -p 9070:9070 docker.io/restatedev/restate
```

### Install Restate CLI

```bash
brew install restatedev/tap/restate
```

Or via npx (no install):

```bash
npx @restatedev/restate 
```

### Install SDK

```bash
npm install @restatedev/restate-sdk
```

Optional packages:
- `@restatedev/restate-sdk-zod` -- Zod validation for handler input/output
- `@restatedev/restate-sdk-clients` -- invoke Restate handlers from external clients
- `@restatedev/restate-sdk-testcontainers` -- testing utilities

### Minimal Scaffold

```ts {"CODE_LOAD::ts/src/develop/service.ts"}
import * as restate from "@restatedev/restate-sdk";

const myService = restate.service({
  name: "MyService",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      return `Hello ${name}!`;
    },
  },
});

restate.serve({ services: [myService] });
```

### Register and Invoke

Start the service (e.g., `npx tsx src/app.ts`), then register and invoke:

```bash
restate deployments register http://localhost:9080
curl localhost:8080/MyService/greet --json '"World"'
```

---

## Core Concepts

- Restate provides durable execution: if a handler crashes or the process restarts, Restate replays the handler from the last completed step, not from scratch.
- All handlers receive a Context object (`ctx`) as their first argument. Use ctx methods for all I/O and side effects.
- Handlers take one optional JSON-serializable input parameter and return one JSON-serializable output.

---

## Service Types

### Service (Stateless)

See minimal scaffold above.

### Virtual Object (Stateful, Keyed)

```ts {"CODE_LOAD::ts/src/develop/virtual_object.ts"}
export const myObject = restate.object({
  name: "MyObject",
  handlers: {
    myHandler: async (ctx: restate.ObjectContext, greeting: string) => {
      return `${greeting} ${ctx.key}!`;
    },
    myConcurrentHandler: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext, greeting: string) => {
        return `${greeting} ${ctx.key}!`;
      }
    ),
  },
});
```

- **Exclusive handlers** (default): only one executes at a time per key. Use for writes.
- **Shared handlers** (`restate.handlers.object.shared`): run concurrently per key. Use for reads.

### Workflow

```ts {"CODE_LOAD::ts/src/develop/workflow.ts"}
export const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: {
    run: async (ctx: restate.WorkflowContext, req: string) => {
      return "success";
    },
    interactWithWorkflow: async (ctx: restate.WorkflowSharedContext) => {
      // resolve a promise the workflow is waiting on
    },
  },
});
```

- `run` executes exactly once per workflow ID. Calling `run` again with the same ID attaches to the existing execution.
- Other handlers can be called concurrently while `run` is in progress. Use them to send signals or read state.

---

## State Management

Never use global variables for state -- it is not durable across restarts. Use `ctx.get`/`ctx.set` instead (available on ObjectContext and WorkflowContext):

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#state"}
const count = (await ctx.get<number>("count")) ?? 0;
ctx.set("count", count + 1);
ctx.clear("count");
ctx.clearAll();
const keys = await ctx.stateKeys();
```

---

## Service Communication

### Request-Response Calls

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#service_calls"}
const response = await ctx.serviceClient(myService).myHandler("Hi");
const response2 = await ctx.objectClient(myObject, "key").myHandler("Hi");
const response3 = await ctx.workflowClient(myWorkflow, "wf-id").run("Hi");
```

### One-Way Calls (Fire-and-Forget)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#sending_messages"}
ctx.serviceSendClient(myService).myHandler("Hi");
ctx.objectSendClient(myObject, "key").myHandler("Hi");
```

### Delayed Calls

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#delayed_messages"}
ctx.serviceSendClient(myService).myHandler(
  "Hi",
  restate.rpc.sendOpts({ delay: { hours: 5 } })
);
```

### Generic Calls (String-Based Service/Method Names)

Use when the target service type is not available at compile time:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#generic_call"}
const response = await ctx.genericCall({
  service: "MyObject",
  method: "myHandler",
  parameter: "Hi",
  key: "Mary",
  inputSerde: restate.serde.json,
  outputSerde: restate.serde.json,
});
```

Generic send variant:

```ts
ctx.genericSend({
  service: "MyService",
  method: "myHandler",
  parameter: "Hi",
  inputSerde: restate.serde.json,
});
```

---

## Side Effects / ctx.run

Never call external APIs, databases, or non-deterministic functions directly in a handler. Wrap them in `ctx.run`:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#durable_steps"}
const result = await ctx.run("my-side-effect", async () => {
  return await callExternalAPI();
});
```

- The first argument is a label used for observability and debugging.
- The return value must be JSON-serializable (or use a custom serde).
- Always `await` the result. Fire-and-forget `ctx.run()` without await loses durability guarantees.

---

## Deterministic Helpers

Never use `Math.random()`, `Date.now()`, or `new Date()` directly -- they break deterministic replay. Use ctx helpers instead:

```ts
const value = ctx.rand.random();
const uuid = ctx.rand.uuidv4();
const now = await ctx.date.now();
```

---

## Durable Timers

Never use `setTimeout`. Use `ctx.sleep` for durable delays that survive crashes and restarts:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#durable_timers"}
await ctx.sleep({ seconds: 30 });
await ctx.sleep({ minutes: 5, seconds: 10 });
```

---

## Awakeables

Awakeables pause execution until an external system signals completion:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#awakeables"}
const { id, promise } = ctx.awakeable<string>();
// Send the awakeable ID to an external system
await ctx.run(() => requestHumanReview(name, id));
// Wait for the external system to resolve/reject
const review = await promise;
```

Resolve or reject from another handler or external system:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#start_awakeables_resolution"}
ctx.resolveAwakeable(id, "Looks good!");
ctx.rejectAwakeable(id, "Cannot be reviewed");
```

---

## Durable Promises (Workflows Only)

Durable promises allow communication between a workflow's `run` handler and its shared handlers:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#workflow_promises"}
// In the run handler -- wait for a signal:
const review = await ctx.promise<string>("review");

// In another handler -- send the signal:
await ctx.promise<string>("review").resolve(review);
```

---

## Concurrency

Always use `RestatePromise` (imported from `@restatedev/restate-sdk`), NOT native `Promise`:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_import"}
import { RestatePromise } from "@restatedev/restate-sdk";
```

### All (wait for all to complete)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_all"}
// WRONG: const results = await Promise.all([call1, call2]);
// CORRECT:
const results = await RestatePromise.all([
  ctx.serviceClient(service1).handler1(),
  ctx.serviceClient(service2).handler2(),
]);
```

### Race (first to settle)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_race"}
const first = await RestatePromise.race([
  ctx.sleep({ milliseconds: 100 }),
  ctx.serviceClient(myService).myHandler("Hi"),
]);
```

### Any (first to succeed)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_any"}
const result = await RestatePromise.any([
  ctx.run(() => callLLM("gpt-4", prompt)),
  ctx.run(() => callLLM("claude", prompt)),
]);
```

### AllSettled (wait for all, regardless of success/failure)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_allsettled"}
const results = await RestatePromise.allSettled([call1, call2]);
```

---

## Invocation Management

### Idempotency Keys

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#cancel"}
const handle = ctx.serviceSendClient(myService).myHandler(
  "Hi",
  restate.rpc.sendOpts({ idempotencyKey: "my-key" })
);
```

### Attach to a Running Invocation

```ts
const invocationId = await handle.invocationId;
const response = await ctx.attach(invocationId);
```

### Cancel an Invocation

```ts
ctx.cancel(invocationId);
```

---

## Serialization

### Default: JSON

All handler inputs/outputs and state values use JSON serialization by default.

### Zod Validation

Install `@restatedev/restate-sdk-zod`, then define schemas:

```ts {"CODE_LOAD::ts/src/develop/serialization.ts#zod"}
import { serde } from "@restatedev/restate-sdk-zod";
import { z } from "zod";

const Greeting = z.object({ name: z.string() });
const GreetingResponse = z.object({ result: z.string() });

const greeter = restate.service({
  name: "Greeter",
  handlers: {
    greet: restate.handlers.handler(
      {
        input: serde.zod(Greeting),
        output: serde.zod(GreetingResponse),
      },
      async (ctx: restate.Context, { name }) => {
        return { result: `Hi ${name}!` };
      }
    ),
  },
});
```

### Binary Data

```ts {"CODE_LOAD::ts/src/develop/serialization.ts#service_definition"}
restate.handlers.handler(
  {
    input: restate.serde.binary,
    output: restate.serde.binary,
  },
  async (ctx: Context, data: Uint8Array): Promise<Uint8Array> => {
    return data;
  }
);
```

---

## Error Handling

Throw `TerminalError` to stop retries and propagate failure permanently:

```ts {"CODE_LOAD::ts/src/develop/error_handling.ts#terminal"}
import { TerminalError } from "@restatedev/restate-sdk";

throw new TerminalError("Something went wrong.", { errorCode: 500 });
```

Any other error type causes automatic retries with exponential backoff. For retry policy configuration, refer to the retry guide.

---

## SDK Clients (External Invocations)

Use `@restatedev/restate-sdk-clients` to call Restate handlers from outside a Restate context (e.g., from a REST API, a script, or a cron job):

```ts {"CODE_LOAD::ts/src/develop/skillsmd/clients.ts#here"}
import * as clients from "@restatedev/restate-sdk-clients";

const restateClient = clients.connect({ url: "http://localhost:8080" });

// Request-response
const result = await restateClient
  .serviceClient<MyService>({ name: "MyService" })
  .myHandler("Hi");

// One-way
restateClient
  .serviceSendClient<MyService>({ name: "MyService" })
  .myHandler("Hi");

// Delayed
restateClient
  .serviceSendClient<MyService>({ name: "MyService" })
  .myHandler("Hi", { delay: { seconds: 30 } });
```

---

## TypeScript-Specific Pitfalls

- **Use `RestatePromise`**, NOT native `Promise`. Native promises break deterministic replay.
- **Return values from `ctx.run()` must be JSON-serializable** (no functions, circular references, or class instances without custom serde).
- **Never use `setTimeout`, `Math.random()`, `Date.now()`, or `new Date()`** -- use Restate Context actions instead.
- **Never use global mutable variables for state** -- use Restate's K/V store for durable state.
- **For detailed API reference:** use the MCP server or TSDocs.

## Testing

Install: `npm install --save-dev @restatedev/restate-sdk-testcontainers`

Tests run against a real Restate Server in Docker via Testcontainers. This catches non-determinism bugs that unit tests miss: if handler code is non-deterministic, replay produces different results and the test fails.

```typescript {"CODE_LOAD::ts/src/develop/skillsmd/testing.test.ts"}
import { RestateTestEnvironment } from "@restatedev/restate-sdk-testcontainers";
import * as clients from "@restatedev/restate-sdk-clients";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { greeter } from "./greeter-service";

describe("MyService", () => {
  let restateTestEnvironment: RestateTestEnvironment;
  let restateIngress: clients.Ingress;

  beforeAll(async () => {
    restateTestEnvironment = await RestateTestEnvironment.start({
      services: [greeter],
      retryAlways: true, // Always replay invocations to catch non-determinism
    });
    restateIngress = clients.connect({ url: restateTestEnvironment.baseUrl() });
  }, 20_000);

  afterAll(async () => {
    await restateTestEnvironment?.stop();
  });

  it("Can call methods", async () => {
    const client = restateIngress.objectClient(greeter, "myKey");
    await client.greet("Test!");
  });

  it("Can read/write state", async () => {
    const state = restateTestEnvironment.stateOf(greeter, "myKey");
    await state.set("count", 123);
    expect(await state.get("count")).toBe(123);
  });
});
```

Key points:
- `retryAlways: true` forces Restate to replay every invocation, catching non-determinism bugs (e.g., unwrapped `Math.random()`, missing `ctx.run()`)
- `stateOf()` reads and writes Virtual Object state for test setup and assertions
- Set `beforeAll` timeout to 20+ seconds for container startup
