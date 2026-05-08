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
- `@restatedev/restate-sdk-gen` -- generator-based API for complex concurrent workflows (experimental)

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

## Generator-based API (experimental)

`@restatedev/restate-sdk-gen` provides a generator-function programming model for handlers with complex concurrent logic — fan-out/fan-in, timeouts, races, and cooperative cancellation. It is built on top of the standard SDK.

Install: `npm install @restatedev/restate-sdk-gen`

### Key concepts

- **`Operation<T>`** — lazy description of work. Build with `gen()`.
- **`Future<T>`** — handle to running work. Yielding the same future twice returns the same value.
- **`run(closure, { name })`** — creates a journal-backed `Future<T>` (like `ctx.run()`).
- **`execute(ctx, operation)`** — runs an operation inside a normal `async` handler.

### Service definitions

```ts
import { service, gen, run, type Operation } from "@restatedev/restate-sdk-gen";

const svc = service({
  name: "svc",
  handlers: {
    // Generator shorthand — no execute() wrapper needed
    *greet(name: string): Operation<string> {
      return yield* run(async () => `Hello, ${name}!`, { name: "greet" });
    },
  },
});
```

### Combinators

```ts
import { all, race, any, allSettled, select, sleep, spawn } from "@restatedev/restate-sdk-gen";

// Wait for all
const [a, b] = yield* all([run(() => fetchA(), { name: "a" }), run(() => fetchB(), { name: "b" })]);

// First to finish
const winner = yield* race([run(() => callPrimary(), { name: "p" }), run(() => callSecondary(), { name: "s" })]);

// First to succeed (throws AggregateError if all fail)
const first = yield* any([run(() => callA(), { name: "a" }), run(() => callB(), { name: "b" })]);

// Tagged race — know which branch won
const r = yield* select({ fast: run(() => callFast(), { name: "fast" }), slow: sleep({ seconds: 5 }) });
if (r.tag === "fast") return yield* r.future;

// Spawn sub-workflow
const t = spawn(mySubWorkflow());
const result = yield* t;
```

### Timeouts

```ts
const r = yield* select({
  done: run(() => callSlow(), { name: "call" }),
  timeout: sleep({ seconds: 5 }),
});
if (r.tag === "timeout") throw new TerminalError("timed out");
return yield* r.future;
```

### Cooperative cancellation

```ts
import { channel } from "@restatedev/restate-sdk-gen";

const stop = channel<void>();
const t = spawn(workerOp(stop));
yield* stop.send(); // signal the worker to stop
const result = yield* t;

// In the worker:
const r = yield* select({ done: run(...), stop: stop.receive });
if (r.tag === "stop") return "stopped";
```

### Pitfalls

- Use a deterministic counter in `run` names — never `Date.now()` or `Math.random()`.
- Always re-throw `CancelledError` — never swallow it.
- Each `spawn` needs a fresh `Operation` — don't reuse generator instances.
- Free functions (`run`, `sleep`, `all`, etc.) must be called inside a `gen()` body.

---

## Further resources

- For detailed API: use the TSDocs https://restatedev.github.io/sdk-typescript/ or the bundled restate-docs MCP server
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples