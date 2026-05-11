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

Or Docker:
```bash
docker run -it docker.restate.dev/restatedev/restate-cli:latest invocations ls
```

### Install SDK

```bash
npm install @restatedev/restate-sdk
```

Optional packages:
- `@restatedev/restate-sdk-zod` -- Zod validation for handler input/output
- `@restatedev/restate-sdk-clients` -- invoke Restate handlers from external clients
- `@restatedev/restate-sdk-testcontainers` -- testing utilities
- `@restatedev/restate-sdk-gen` -- experimental generator-based DSL for composing durable workflows (see below)

### Minimal Scaffold

```ts {"CODE_LOAD::ts/src/develop/service.ts"}
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
```

- **Exclusive handlers** (default): only one executes at a time per key. Use for writes. Receive `ObjectContext`.
- **Shared handlers** (`restate.handlers.object.shared`): run concurrently per key. Use for reads. Receive `ObjectSharedContext`.

### Workflow

```ts {"CODE_LOAD::ts/src/develop/workflow.ts"}
```

- `run` executes exactly once per workflow ID. Calling `run` again with the same ID attaches to the existing execution. Uses `WorkflowContext`.
- Other handlers can be called concurrently while `run` is in progress. Use them to send signals or read state. Use `WorkflowSharedContext`.

---

## State Management

Never use global variables for state -- it is not durable across restarts. Use `ctx.get`/`ctx.set` instead:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#state"}
```

---

## Service Communication

### Request-Response Calls

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#service_calls"}
```

### One-Way Calls (Fire-and-Forget)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#sending_messages"}
```

### Delayed messages

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#delayed_messages"}
```

### Generic Calls (String-Based Service/Method Names)

Use when the target service type is not available at compile time:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#generic_call"}
```

Generic send variant:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#generic_send"}
```

---

## Side Effects / ctx.run

Never call external APIs, databases, or non-deterministic functions directly in a handler. Wrap them in `ctx.run`:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#durable_steps"}
```

- The first argument is a label used for observability and debugging.
- The return value must be JSON-serializable (or use a custom serde).
- No Restate context actions within `ctx.run()`.

---

## Deterministic Helpers

Never use `Math.random()`, `Date.now()`, or `new Date()` directly -- they break deterministic replay. Use ctx helpers instead:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#deterministic_helpers"}
```

---

## Durable Timers

Never use `setTimeout`. Use `ctx.sleep` for durable delays that survive crashes and restarts:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#durable_timers"}
```

No limit on duration, but long sleeps in exclusive handlers block other calls for that key.

---

## Awakeables

Awakeables pause execution until an external system signals completion:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#awakeables"}
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

Or from another handler:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#awakeables_resolution"}
```

---

## Durable Promises (Workflows Only)

Durable promises allow communication between a workflow's `run` handler and its shared handlers:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#workflow_promises"}
```

---

## Concurrency

Always use `RestatePromise` (imported from `@restatedev/restate-sdk`), NOT native `Promise`:

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_import"}
```

### All (wait for all to complete)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_all"}
```

### Race (first to settle)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_race"}
```

### Any (first to succeed)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_any"}
```

### AllSettled (wait for all, regardless of success/failure)

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#promise_allsettled"}
```

---

## Invocation Management

### Idempotency Keys

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#idempotency"}
```

### Attach to a Running Invocation

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#attach"}
```

### Cancel an Invocation

```ts {"CODE_LOAD::ts/src/develop/skillsmd/actions.ts#cancel"}
```

---

## Serialization

### Default: JSON

All handler inputs/outputs and state values use JSON serialization by default.

### Zod Validation

Install `@restatedev/restate-sdk-zod`, then define schemas:

```ts {"CODE_LOAD::ts/src/develop/serialization.ts#zod"}
```

### Binary Data

```ts {"CODE_LOAD::ts/src/develop/serialization.ts#service_definition"}
```

---

## Error Handling

Throw `TerminalError` to stop retries and propagate failure permanently:

```ts {"CODE_LOAD::ts/src/develop/error_handling.ts#terminal"}
```


All other exceptions are retried with exponential backoff by default, and eventually paused.

Catch `TerminalError` from `ctx.run` to handle permanent failures and execute compensations (see sagas).

---

## SDK Clients (External Invocations)

Use `@restatedev/restate-sdk-clients` to call Restate handlers from outside a Restate context (e.g., from a REST API, a script, or a cron job):

```ts {"CODE_LOAD::ts/src/develop/skillsmd/clients.ts#here"}
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

Tests run against a real Restate Server in Docker via Testcontainers. 

```typescript {"CODE_LOAD::ts/src/develop/skillsmd/testing.test.ts"}
```

Use tests also to catch non-determinism bugs that unit tests miss: if handler code is non-deterministic, replay produces different results and the test fails.

---

---

## Experimental: Generator-based API (`restate-sdk-gen`)

`@restatedev/restate-sdk-gen` is an experimental alternative for writing handlers with complex concurrency patterns. Instead of `await`-ing `RestatePromise` values, you `yield*` **Operations** and **Futures** inside generator functions. This makes parallel fan-out, race, select, and spawn patterns read as straight-line code without threading `ctx` through every call.

```bash
npm install @restatedev/restate-sdk @restatedev/restate-sdk-gen
```

```ts
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run, all } from "@restatedev/restate-sdk-gen";

const mySvc = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context, input: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          const a = run(() => fetchA(), { name: "a" });
          const b = run(() => fetchB(), { name: "b" });
          const [aVal, bVal] = yield* all([a, b]);
          return `${aVal}+${bVal} for ${input}`;
        })
      ),
  },
});
```

Key differences from the standard SDK:
- Use `run(action, { name })` instead of `ctx.run(name, action)` — no `ctx` needed inside the generator body
- Use `sleep({ seconds: N })` instead of `ctx.sleep(...)`
- Use `all`, `race`, `select`, `spawn` as free-standing functions, NOT `RestatePromise.all/race`
- Use `state<T>()` instead of `ctx.get/set`
- The generator is driven by `execute(ctx, gen(function*() { ... }))` inside a normal `async` handler

**API is experimental** — it may change in future releases. For stable workflows, use the standard SDK with `ctx.*` methods and `RestatePromise`.

For detailed patterns (timeouts, sagas, cooperative cancellation, polling), see https://docs.restate.dev/develop/ts/generator-api

---

## Further resources

- For detailed API: use the TSDocs https://restatedev.github.io/sdk-typescript/ or the bundled restate-docs MCP server
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples