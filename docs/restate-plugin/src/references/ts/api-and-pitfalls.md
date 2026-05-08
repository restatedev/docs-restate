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

### Default serde for the ingress client

Pass a `serde` option to `clients.connect()` to use it as the default serializer for all handler calls, workflow attaches, awakeable resolution, and result retrieval — instead of specifying it on every individual call:

```ts
import * as clients from "@restatedev/restate-sdk-clients";
import * as restate from "@restatedev/restate-sdk";

const restateClient = clients.connect({
  url: "http://localhost:8080",
  serde: restate.serde.binary, // default for all operations
});

// Per-call options override the connection default:
await restateClient.resolveAwakeable(id, payload, restate.serde.json);
const output = await restateClient.result(handle, restate.serde.json);
```

Priority: per-call serde → connection-level serde → `restate.serde.json`.

---

## Generator-based DSL (`@restatedev/restate-sdk-gen`, experimental)

An optional package that provides a generator/coroutine-based DSL for composing complex workflows with structured concurrency primitives.

```bash
npm install @restatedev/restate-sdk @restatedev/restate-sdk-gen
```

### Key concepts

- **`gen(factory)`** — creates an `Operation<T>` from a generator factory function.
- **`execute(ctx, op)`** — runs an `Operation<T>` inside a handler, wiring it to the Restate journal.
- **`Future<T>`** — an eager, memoized handle returned by `run`, `sleep`, `awakeable`, and `spawn`.
- Free-standing functions (`run`, `sleep`, `all`, etc.) work inside `gen()` bodies without needing to pass `ctx`.

### Primitives

| Function | Description |
|----------|-------------|
| `run(action, opts?)` | Journaled side effect. `action` receives `{ signal: AbortSignal }`. Supports `opts.retry`. |
| `sleep(duration)` | Journaled timer. |
| `awakeable<T>()` | Returns `{ id, promise: Future<T> }`. |
| `channel<T>()` | Single-shot in-memory channel for cooperative stop signaling. |
| `spawn(op)` | Runs an `Operation` as a concurrent routine; returns `Future<T>`. |
| `state<T>()` / `sharedState<T>()` | Typed K/V store. |
| `serviceClient` / `objectClient` / `workflowClient` | Typed RPC to other services. |

### Combinators

| Combinator | Description |
|------------|-------------|
| `all(futures)` | Wait for all; returns values in order. |
| `race(futures)` | First to settle wins; losers keep running. |
| `any(futures)` | First to succeed; throws `AggregateError` if all fail. |
| `allSettled(futures)` | Wait for all; never throws. |
| `select({tag: future})` | First to settle; returns `{ tag, future }` for switching. |

### Quick example

```ts
import * as restate from "@restatedev/restate-sdk";
import { gen, execute, run, all, select, sleep } from "@restatedev/restate-sdk-gen";

const myService = restate.service({
  name: "MyService",
  handlers: {
    process: async (ctx: restate.Context, id: string): Promise<string> =>
      execute(
        ctx,
        gen(function* () {
          // Parallel work
          const [a, b] = yield* all([
            run(() => fetchA(id), { name: "a" }),
            run(() => fetchB(id), { name: "b" }),
          ]);

          // Timeout
          const r = yield* select({
            done: run(() => slowStep(a, b), { name: "slow" }),
            timeout: sleep({ seconds: 10 }),
          });
          if (r.tag === "timeout") throw new Error("timed out");
          return yield* r.future;
        })
      ),
  },
});
```

### Key pitfalls

- **Only call free functions inside `gen()` bodies.** Calling `run`, `sleep`, etc. outside an active fiber throws an error.
- **Journal entry names must be deterministic.** Don't use `Date.now()` or `Math.random()` in names.
- **Each `spawn` needs a fresh `Operation`.** Don't reuse generator instances.
- **Don't catch `CancelledError` and swallow it.** Always re-throw it after cleanup.

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

## Further resources

- For detailed API: use the TSDocs https://restatedev.github.io/sdk-typescript/ or the bundled restate-docs MCP server
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples