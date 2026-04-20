# Python SDK Reference

## Setup

### Restate Server

Install the Restate Server via one of:

```shell
# Docker (recommended for Python projects)
docker run --name restate_dev --rm -p 8080:8080 -p 9070:9070 -p 9071:9071 \
  docker.io/restatedev/restate:latest

# Homebrew
brew install restatedev/tap/restate-server
restate-server

# npx (if Node.js is available)
npx @restatedev/restate-server
```

### Install Restate CLI

```bash
brew install restatedev/tap/restate
```

Or Docker:
```bash
docker run -it docker.restate.dev/restatedev/restate-cli:latest invocations ls
```

### SDK installation

```shell
pip install restate-sdk
# or with uv
uv add restate-sdk
```

Optional extras:

| Extra | Install command | Purpose |
|-------|----------------|---------|
| Pydantic support | `pip install restate-sdk[serde]` | Pydantic model serialization |
| Testing harness | `pip install restate-sdk[harness]` | Local testing without server |

### Minimal scaffold

```python {"CODE_LOAD::python/src/develop/my_service.py"}
```

### Register and invoke

Start the service with `uv run app.py`, then register and invoke:

```shell
restate deployments register http://localhost:9080
curl localhost:8080/MyService/myHandler --json '"World"'
```

---

## Core Concepts

- Restate provides durable execution: if a handler crashes or the process restarts, Restate replays the handler from the last completed step, not from scratch.
- All handlers receive a Context object (`ctx`) as their first argument. Use ctx methods for all I/O and side effects.
- Handlers take one optional JSON-serializable input parameter and return one JSON-serializable output.

---

## Service types

### Service (stateless)

See minimal scaffold above.

### Virtual Object (stateful, keyed)

```python {"CODE_LOAD::python/src/develop/my_virtual_object.py"}
```

- Exclusive handlers (default): one invocation at a time per key. Use for writes. Receive `ObjectContext`.
- Shared handlers (`kind="shared"`): concurrent, read-only. Receive `ObjectSharedContext`.
- Access the key via `ctx.key()`.

### Workflow

```python {"CODE_LOAD::python/src/develop/my_workflow.py"}
```

- `run` executes exactly once per workflow ID. Calling `run` again with the same ID attaches to the existing execution. Uses `WorkflowContext`.
- Other handlers can be called concurrently while `run` is in progress. Use them to send signals or read state. Use `WorkflowSharedContext`.

---

## State

Never use global variables for state -- it is not durable across restarts. Use `ctx.get`/`ctx.set` instead:

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#state"}
```

---

## Service Communication

### Request-response calls

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#service_calls"}
```

### One-way messages (fire-and-forget)

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#sending_messages"}
```

### Delayed messages

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#delayed_messages"}
```

### Generic calls (String-Based Service/Method Names)

Use when the service definition is not available at compile time:

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#request_response_generic"}
```

## Side effects (ctx.run)

Wrap all non-deterministic operations (API calls, DB writes, HTTP requests, file I/O) in `ctx.run` to journal their results.

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#durable_steps"}
```

- The first argument is a label used for observability and debugging.
- The return value must be JSON-serializable with the json library or as Pydantic model (or use a custom serde).
- No Restate context actions within `ctx.run()`.

---

## Deterministic helpers

Never use `random.random()`, `time.time()`, `datetime.now()`, or `uuid.uuid4()` directly. These produce different values on replay. Instead:

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#deterministic_helpers"}
```

---

## Timers (durable sleep)

Never use `setTimeout`. Use `ctx.sleep` for durable delays that survive crashes and restarts:

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#durable_timers"}
```

No limit on duration, but long sleeps in exclusive handlers block other calls for that key.

---

## Awakeables

Pause a handler until an external system signals completion.

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#awakeables"}
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

Or from another handler:

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#awakeables_resolution"}
```

---

## Durable promises

Cross-handler signaling within a Workflow. No ID management needed.

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#workflow_promises"}
```

---

## Concurrency

Never use `asyncio.gather` / `asyncio.wait`. Native asyncio combinators are not journaled and break deterministic replay. Use Restate Promises combinators instead.

### Gather (wait for all)

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#gather"}
```

### Select (race, first to complete)

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#select"}
```

### Wait completed (completed + pending split)

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#wait_completed"}
```

### As completed (process in completion order)

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#as_completed"}
```

---

## Invocation management

### Idempotency Keys

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#idempotency"}
```

### Attach to a Running Invocation

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#attach"}
```

### Cancel an Invocation

```python {"CODE_LOAD::python/src/develop/skillsmd/actions.py#cancel"}
```

---

## Serialization

### Default

JSON serialization via Python's `json` library. Primitive types, `TypedDict`, and simple dataclasses work out of the box.

### Pydantic models

Install `restate-sdk[serde]`. Then use Pydantic models directly as handler input/output and in state operations:

```python {"CODE_LOAD::python/src/develop/skillsmd/serialization.py#pydantic"}
```

Pydantic models also work with `ctx.get`, `ctx.awakeable`, and `ctx.run_typed` via the `type_hint` parameter.

---

## Error handling

### Terminal errors (no retry)

Raise `TerminalError` to stop retries and propagate failure permanently:

```python {"CODE_LOAD::python/src/develop/skillsmd/error_handling.py#terminal"}
```

All other exceptions are retried with exponential backoff by default, and eventually paused.

Catch `TerminalError` from `ctx.run` to handle permanent failures and execute compensations (see sagas).

---

## Python-specific pitfalls (CRITICAL)

### 1. NEVER use bare `except:` or `except Exception:`

Bare exception handlers catch Restate SDK internal exceptions (suspension signals, terminal errors), causing silent failures and lost journal entries.

```python {"CODE_LOAD::python/src/develop/skillsmd/error_handling.py#catch"}
```

### 2. Use Restate concurrency combinators, not asyncio

### 3. Use ctx.run_typed for better type safety

### 4. No native random, time, or UUID. Use Restate's deterministic helpers instead.

### 5. No ctx operations inside ctx.run blocks

Read state before `ctx.run`, then use the value inside. No `ctx.get`, `ctx.set`, `ctx.sleep`, service calls, or nested `ctx.run` inside run blocks.

### 6. Return values from ctx.run must be JSON-serializable

Use Pydantic models or custom serializers for complex types.

---

## Testing

Install: `pip install restate-sdk[harness]`

Tests run against a real Restate Server in Docker via Testcontainers. 

```python {"CODE_LOAD::python/src/develop/skillsmd/testing.py#here"}
```

Use tests also to catch non-determinism bugs that unit tests miss: if handler code is non-deterministic, replay produces different results and the test fails.

---

## Further resources

- For detailed API: use the bundled restate-docs MCP server or Python SDK documentation
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples
