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
| OpenAI Agents | `pip install restate-sdk[openai]` | OpenAI Agents SDK integration |
| Google ADK | `pip install restate-sdk[adk]` | Google ADK integration |

### Minimal scaffold

```python
import restate

my_service = restate.Service("MyService")

@my_service.handler("myHandler")
async def my_handler(ctx: restate.Context, greeting: str) -> str:
    return f"{greeting}!"

app = restate.app([my_service])
```

### Register and invoke

```shell
# Register the service with Restate Server
restate deployments register http://localhost:9080

# Invoke the handler
curl localhost:8080/MyService/myHandler --json '"World"'
```

---

## Service types

### Service (stateless)

- `restate.Service("Name")`, handlers decorated with `@service.handler("name")`.
- Handlers receive `restate.Context`. No state, unlimited concurrency.
- Callable at `<RESTATE_INGRESS>/MyService/myHandler`.

### Virtual Object (stateful, keyed)

```python
my_object = restate.VirtualObject("MyVirtualObject")

@my_object.handler("myHandler")
async def my_handler(ctx: restate.ObjectContext, greeting: str) -> str:
    return f"{greeting} {ctx.key()}!"

@my_object.handler(kind="shared")
async def my_concurrent_handler(ctx: restate.ObjectSharedContext, greeting: str) -> str:
    return f"{greeting} {ctx.key()}!"
```

- Exclusive handlers (default): one invocation at a time per key. Receive `ObjectContext`.
- Shared handlers (`kind="shared"`): concurrent, read-only. Receive `ObjectSharedContext`.
- Access the key via `ctx.key()`.

### Workflow (exactly-once per ID)

```python
my_workflow = restate.Workflow("MyWorkflow")

@my_workflow.main()
async def run(ctx: restate.WorkflowContext, req: str) -> str:
    return "success"

@my_workflow.handler()
async def interact_with_workflow(ctx: restate.WorkflowSharedContext, req: str):
    return
```

- `run` handler (`@my_workflow.main()`) executes exactly once per workflow ID. Uses `WorkflowContext`.
- Interaction handlers (`@my_workflow.handler()`) run concurrently. Use `WorkflowSharedContext`.
- Access the workflow ID via `ctx.key()`.

---

## State

Available in Virtual Objects and Workflows only.

```python
# List all state keys
state_keys = ctx.state_keys()

# Get state (returns None if not set)
my_string = await ctx.get("my-string-key", type_hint=str) or "default"
my_number = await ctx.get("my-number-key", type_hint=int) or 0

# Set state
ctx.set("my-key", "my-new-value")

# Clear a single key
ctx.clear("my-key")

# Clear all state
ctx.clear_all()
```

---

## Communication

### Request-response calls

```python
# Call a Service handler
response = await ctx.service_call(my_handler, arg="Hi")

# Call a Virtual Object handler
response = await ctx.object_call(my_object_handler, key="Mary", arg="Hi")

# Call a Workflow run handler (once per workflow ID)
response = await ctx.workflow_call(run, key="my_workflow_id", arg="Hi")

# Call a Workflow interaction handler
response = await ctx.workflow_call(interact_with_workflow, key="my_workflow_id", arg="Hi")
```

### One-way messages (fire-and-forget)

```python
ctx.service_send(my_handler, arg="Hi")
ctx.object_send(my_object_handler, key="Mary", arg="Hi")
ctx.workflow_send(run, key="my_wf_id", arg="Hi")
ctx.workflow_send(interact_with_workflow, key="my_wf_id", arg="Hi")
```

### Delayed messages

```python
from datetime import timedelta

ctx.service_send(my_handler, arg="Hi", send_delay=timedelta(hours=5))
ctx.object_send(my_object_handler, key="Mary", arg="Hi", send_delay=timedelta(hours=5))
ctx.workflow_send(run, key="my_workflow_id", arg="Hi", send_delay=timedelta(hours=5))
```

### Generic calls (dynamic service/handler names)

Use when the service definition is not available at compile time:

```python
import json
response_bytes = await ctx.generic_call(
    "MyObject", "my_handler", key="Mary", arg=json.dumps("Hi").encode("utf-8")
)
ctx.generic_send("MyService", "my_handler", arg=json.dumps("Hi").encode("utf-8"))
```

### Idempotency keys

```python
await ctx.service_call(my_handler, arg="Hi", idempotency_key="my-idempotency-key")
```

---

## Side effects (ctx.run)

Wrap all non-deterministic operations (API calls, DB writes, HTTP requests, file I/O) in `ctx.run` to journal their results.

```python
# Lambda form
result = await ctx.run("my-side-effect", lambda: call_external_api("weather", "123"))

# Typed form (passes kwargs to the function, better type safety)
result = await ctx.run_typed("my-side-effect", call_external_api, query="weather", some_id="123")

# With retry policy
from datetime import timedelta
from restate.exceptions import TerminalError

try:
    await ctx.run_typed(
        "write",
        write_to_other_system,
        restate.RunOptions(
            initial_retry_interval=timedelta(milliseconds=100),
            retry_interval_factor=2.0,
            max_retry_interval=timedelta(seconds=10),
            max_duration=timedelta(minutes=5),
            max_attempts=10,
        ))
except TerminalError as err:
    # Handle after retries exhausted
    raise err
```

CRITICAL: No Restate context operations inside `ctx.run` blocks. No `ctx.get`, `ctx.set`, `ctx.sleep`, service calls, or nested `ctx.run`.

---

## Deterministic helpers

Never use `random.random()`, `time.time()`, `datetime.now()`, or `uuid.uuid4()` directly. These produce different values on replay.

```python
# Deterministic UUID
my_uuid = ctx.uuid()

# Deterministic random float (0 to 1)
ctx.random().random()

# Deterministic time (millis since epoch, consistent across retries)
current_time = await ctx.time()
```

---

## Timers (durable sleep)

```python
from datetime import timedelta

await ctx.sleep(delta=timedelta(seconds=30))
```

Survives crashes and restarts. No limit on duration, but long sleeps in exclusive handlers block other calls for that key.

---

## Awakeables

Pause a handler until an external system signals completion.

```python
# Create and wait
id, promise = ctx.awakeable(type_hint=str)

# Send the ID to an external system (inside ctx.run)
await ctx.run_typed("trigger task", request_human_review, name=name, id=id)

# Wait for the external signal
review = await promise

# Resolve from another handler
ctx.resolve_awakeable(awakeable_id, "Looks good!")

# Reject from another handler
ctx.reject_awakeable(awakeable_id, "Cannot be reviewed")
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

---

## Durable promises

Cross-handler signaling within a Workflow. No ID management needed.

```python
# Wait for a promise (in the run handler)
review = await ctx.promise("review", type_hint=str).value()

# Resolve from an interaction handler
await ctx.promise("review", type_hint=str).resolve("approval")
```

---

## Concurrency

CRITICAL: Use `restate.gather` / `restate.select`, NOT `asyncio.gather` / `asyncio.wait`. Native asyncio combinators are not journaled and break deterministic replay.

### Gather (wait for all)

```python
claude = ctx.service_call(claude_sonnet, arg="What is the weather?")
openai = ctx.service_call(open_ai, arg="What is the weather?")

results_done = await restate.gather(claude, openai)
results = [await result for result in results_done]
```

### Select (race, first to complete)

```python
from datetime import timedelta
from restate.exceptions import TerminalError

_, confirmation_future = ctx.awakeable(type_hint=str)
match await restate.select(
    confirmation=confirmation_future, timeout=ctx.sleep(timedelta(days=1))
):
    case ["confirmation", "ok"]:
        return "success!"
    case ["confirmation", "deny"]:
        raise TerminalError("Confirmation was denied!")
    case _:
        raise TerminalError("Verification timer expired!")
```

### Wait completed (completed + pending split)

```python
done, pending = await restate.wait_completed(call1, call2)
results = [await f for f in done]
# Cancel pending if needed
```

### As completed (process in completion order)

```python
async for future in restate.as_completed(call1, call2):
    print(await future)
```

### Parallel execution (start without awaiting)

```python
call1 = ctx.run_typed("fetch_user", fetch_user_data, user_id=123)
call2 = ctx.service_call(calculate_metrics, arg=123)
user = await call1
metrics = await call2
```

---

## Invocation management

### Get invocation ID from a send

```python
handle = ctx.service_send(my_handler, arg="Hi", idempotency_key="my-key")
invocation_id = await handle.invocation_id()
```

### Attach to a running invocation

```python
result = await ctx.attach_invocation(invocation_id, type_hint=str)
```

### Cancel an invocation

```python
ctx.cancel_invocation(invocation_id)
```

---

## Serialization

### Default

JSON serialization via Python's `json` library. Primitive types, `TypedDict`, and simple dataclasses work out of the box.

### Pydantic models

Install `restate-sdk[serde]`. Then use Pydantic models directly as handler input/output and in state operations:

```python
from pydantic import BaseModel

class Greeting(BaseModel):
    name: str

class GreetingResponse(BaseModel):
    result: str

@my_service.handler()
async def greet(ctx: restate.Context, greeting: Greeting) -> GreetingResponse:
    return GreetingResponse(result=f"Hi {greeting.name}!")
```

Pydantic models also work with `ctx.get`, `ctx.awakeable`, and `ctx.run_typed` via the `type_hint` parameter.

---

## Error handling

### Terminal errors (no retry)

```python
from restate.exceptions import TerminalError

raise TerminalError("Invalid input - will not retry")
```

All other exceptions are retried infinitely with exponential backoff by default.

Catch `TerminalError` from `ctx.run` to handle permanent failures and execute compensations (see sagas guide).

---

## Python-specific pitfalls (CRITICAL)

### 1. NEVER use bare `except:` or `except Exception:`

Bare exception handlers catch Restate SDK internal exceptions (suspension signals, terminal errors), causing silent failures and lost journal entries.

```python
# BAD - catches Restate internals, causes silent failures
try:
    result = await ctx.service_call(some_handler, arg="Hi")
except Exception:
    pass

# GOOD - catch only specific exceptions
try:
    result = await ctx.service_call(some_handler, arg="Hi")
except TerminalError as e:
    raise e
```

### 2. Use Restate concurrency combinators, not asyncio

| Native (WRONG) | Restate (CORRECT) |
|---|---|
| `asyncio.gather` | `restate.gather` |
| `asyncio.wait` | `restate.select` / `restate.wait_completed` |
| `asyncio.sleep` | `ctx.sleep` |

### 3. Use ctx.run_typed for better type safety

`ctx.run_typed` passes keyword arguments directly to the function, providing better IDE support and type checking compared to lambda-based `ctx.run`.

### 4. No native random, time, or UUID

| Native (WRONG) | Restate (CORRECT) |
|---|---|
| `random.random()` | `ctx.random().random()` |
| `time.time()` / `datetime.now()` | `await ctx.time()` |
| `uuid.uuid4()` | `ctx.uuid()` |

### 5. No ctx operations inside ctx.run blocks

Read state before `ctx.run`, then use the value inside. No `ctx.get`, `ctx.set`, `ctx.sleep`, service calls, or nested `ctx.run` inside run blocks.

### 6. Return values from ctx.run must be JSON-serializable

Use Pydantic models or custom serializers for complex types.

### 7. Do not use threads or multiprocessing for Restate operations

All Restate context operations must happen on the same async event loop.

---

## Further resources

- For testing: use the bundled restate-docs MCP server
- For detailed API: use MCP or Python SDK documentation
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples
