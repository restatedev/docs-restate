# Restate — durable workflows (Python & Rust SDKs)

Restate is a durable-execution orchestrator. This guide was written against server 1.6.2, Python SDK 0.15.0, Rust SDK 0.9.0. The concepts (journal, determinism, service types, timeouts, versioning) are server-side and language-agnostic — sections below note Python vs Rust syntax where they differ. Running examples use order/payment processing, but the patterns are general.

**Reference repos** (clone locally for source-level answers):
- `restatedev/sdk-python` — Python SDK source. API surface: `python/restate/context.py`.
- `restatedev/sdk-rust` — Rust SDK source. API surface: `src/lib.rs`, `src/context/`, `src/errors.rs`, `macros/`.
- `restatedev/examples` — canonical patterns. `python/patterns-use-cases/sagas/`, `rust/basics/src/p3_workflows.rs`.
- `restatedev/documentation` — `docs/develop/python/`, `docs/guides/error-handling.mdx`, `docs/guides/sagas.mdx`, `docs/operate/versioning.mdx`.

## Service types — pick the right one

| Type | When | State | Concurrency | Example |
|---|---|---|---|---|
| `restate.Workflow` | One-shot orchestration with a result. `run` executes **exactly once** per workflow ID. | Per-execution; cleared after `workflow_completion_retention` (default 24h). | Signal/query handlers run concurrently with `run`. | `OrderWorkflow`, `SignupWorkflow` |
| `restate.VirtualObject` | Long-lived per-key entity. State persists across invocations. | Per-key, indefinite. | Handlers serialised on the key (`exclusive`) or concurrent (`shared`). | An `Account` object keyed on account ID — serialises concurrent operations on the account, holds last-known balance. |
| `restate.Service` | Stateless functions. | None. | Unbounded. | `EmailNotifier` |

For per-resource operations, the recommended shape is **Workflow + companion VirtualObject**: the Workflow does the one-shot orchestration; the VirtualObject (keyed on the resource ID) holds durable resource state and acts as a mutex so two workflows can't mutate the same resource simultaneously.

## Determinism — what goes in `ctx.run_typed`

Handler bodies are **replayed** from the journal on retry/recovery. Anything non-deterministic must be wrapped:

```python
# YES — wrap network I/O, filesystem, env lookup, randomness
result = await ctx.run_typed("fetch_status", payments.get_charge_status)

# NO — never call ctx inside a ctx.run_typed action
# NO — don't interleave: await ctx.run_typed *immediately*, don't store the future
```

**Use the built-ins instead of wrapping stdlib**:
- `await ctx.time()` → deterministic `float` epoch. **Don't** wrap `datetime.now()` in `ctx.run_typed`.
- `ctx.uuid()` → deterministic UUID.
- `ctx.random()` → deterministic `random.Random` instance.
- `await ctx.sleep(timedelta(...))` → durable timer.

`ctx.run` (untyped) is **deprecated** — always use `ctx.run_typed`.

## Retry policy — use `RunOptions`, don't hand-roll

By default `ctx.run_typed` retries **forever** with exponential backoff. Override per call:

```python
from restate import RunOptions
from datetime import timedelta

await ctx.run_typed(
    "upload_report",
    upload_report,
    RunOptions(
        max_attempts=3,
        initial_retry_interval=timedelta(seconds=2),
        retry_interval_factor=2.0,
        max_retry_interval=timedelta(seconds=30),
        max_duration=timedelta(minutes=10),
    ),
    account_id=account_id, report=report,
)
# RunOptions is the 3rd POSITIONAL arg — fn args/kwargs come after.
```

When retries are exhausted, Restate raises `TerminalError` — catch that for saga compensation. **Do not** write `try/except` + manual `ctx.sleep` + re-call loops for retrying a single action; that bloats the journal and bypasses server-side retry observability.

Polling (where each attempt is a *different* observation, not a retry of a failed call) is the exception — there a `for n in range(...)` + `ctx.run_typed(f"poll[{n}]", ...)` + `ctx.sleep` loop is correct.

**Polling loop vs single retry-until-ready `ctx.run`:** default to the explicit `for n in range(...)` + `ctx.run_typed(f"phase_poll[{n}]", ...)` + `ctx.sleep` loop — that's what every upstream example does. Reserve the single-`ctx.run`-with-`RunOptions` shape for a **transport-level reachability wait**, where the probe *genuinely fails* (connect refused, TLS handshake error, 503, RPC timeout) — e.g. "is the dependency reachable again after a restart". There `RunOptions(max_duration=.., initial_retry_interval=.., retry_interval_factor=1.0)` gives one journal entry and the `backing-off` status is semantically honest. **Do not** raise a synthetic exception when the call *succeeds* but returns `{status: InProgress}` / lock-held / read-not-yet-consistent: upstream defines `backing-off` as "retrying due to a failure", so you'd be polluting `restate invocations list --status backing-off` with healthy waits ("Retried 141 time(s)" for intended behaviour) and misleading retry-count alerting. For successful-but-not-yet observations use the explicit loop, `ctx.set("phase", ...)` so the status handler shows what's pending, and act mid-wait if needed (stall warning after N polls, % progress, error-code branching). If the external system can call back, `ctx.awakeable()` beats both.

Service- and handler-level defaults: `Workflow(..., invocation_retry_policy=InvocationRetryPolicy(...))`.

## Error semantics

- Raise `TerminalError(msg)` for **unrecoverable** failures (bad input, precondition violated, "account permanently closed"). Not retried.
- `RetryableError(msg, retry_after=timedelta(...))` for transient failures with an explicit backoff hint.
- Any other exception → transient, retried per the active policy.
- Exhausted `RunOptions.max_attempts` → automatically becomes `TerminalError`.
- Invocation cancellation also surfaces as `TerminalError` — saga `except TerminalError:` blocks handle both.
- **Never `except Exception:` or `except BaseException:`** in workflow code — it swallows `SdkInternalBaseException` / `SuspendedException` and breaks replay. Catch `TerminalError` or your own concrete types.

## Typing & serialization — use Pydantic, not `dict[str, Any]`

The `[serde]` extra wires up `PydanticJsonSerde` automatically from type hints. Handler args, return values, `ctx.set`/`ctx.get` values, and `ctx.run_typed` results can all be Pydantic models:

```python
from pydantic import BaseModel

class OrderRequest(BaseModel):
    order_id: str
    items: list[LineItem]
    promo_code: str | None = None

class OrderStatus(BaseModel):
    phase: Phase
    started_at: float
    warnings: list[str] = []
    last_poll: PollResult | None = None

@order_wf.main()
async def run(ctx: WorkflowContext, req: OrderRequest) -> OrderResult:
    ctx.set("status", OrderStatus(phase=Phase.VALIDATE, started_at=await ctx.time()))
    ...

@order_wf.handler()
async def status(ctx: WorkflowSharedContext) -> OrderStatus | None:
    return await ctx.get("status", type_hint=OrderStatus)
```

Prefer this over `dict[str, Any]` + manual `as_dict()` — it's type-checked and the Restate UI renders the JSON the same. (`DefaultSerde` also auto-handles `@dataclass` via dacite and msgspec `Struct`.)

**`ctx.get` needs `type_hint=`.** `ctx.set("status", model)` stores serialized JSON; a bare `await ctx.get("status")` returns the deserialized **dict**, not the model. If the handler's return type is `OrderStatus | None`, the SDK's `PydanticJsonSerde` then calls `.model_dump_json()` on that dict → `AttributeError: 'dict' object has no attribute 'model_dump_json'`. Always pass `type_hint=` (the example above does).

## State & progress exposure

Only `@wf.main()` can mutate state (`ctx.set`). Shared `@wf.handler()` reads it (`ctx.get`) — this is the canonical progress-query pattern. Each `ctx.set` is a journal entry, so **accumulate then write once** rather than overwriting the same key in a loop: `ctx.set("warning", w)` per iteration both loses earlier warnings *and* bloats the journal; build a list and `ctx.set("warnings", warnings)` after the loop.

State survives until `workflow_completion_retention` after `run` returns — set this on the `Workflow(...)` constructor if 24h isn't right.

## Timeouts — set these for long activities

Server defaults (`crates/types/src/config/worker.rs`): `inactivity_timeout=60s`, `abort_timeout=600s`. After 60s with no journal progress the server asks the SDK to suspend; if it can't (a `ctx.run_typed` action is in flight) the abort fires 10 min later. So a single `ctx.run_typed` action has **~11 min** before it's hard-killed by default. Anything longer (a large file transfer over a slow link, a long batch step) needs explicit timeouts on the service:

```python
report_wf = restate.Workflow(
    "GenerateReport",
    inactivity_timeout=timedelta(minutes=10),
    abort_timeout=timedelta(minutes=12),
)
```

Or per-handler via `@wf.main(inactivity_timeout=..., abort_timeout=...)`.

## Sagas — compensation on `TerminalError`

No DSL; build a list and unwind. Register the compensation **before** the action when the action isn't safely re-runnable.

```python
compensations: list[Callable[[], Awaitable[None]]] = []
try:
    compensations.append(lambda: ctx.run_typed("refund_payment", payments.refund))
    await ctx.run_typed("charge_payment", payments.charge)

    compensations.append(lambda: ctx.run_typed("release_inventory", inventory.release))
    await ctx.run_typed("reserve_inventory", inventory.reserve)
except TerminalError:
    for c in reversed(compensations):
        await c()
    raise
```

When a half-applied sequence can leave an external system in an unrecoverable state, make the earlier steps **verify-don't-mutate** and push all mutation into a final commit step whose compensation you design explicitly.

## Signals — operator approval / external completion

Inside a Workflow, use **durable promises** (resolved by another handler on the same workflow):

```python
# in run():
approval = await ctx.promise("refund_approved").value()
# or with timeout:
match await restate.select(ok=ctx.promise("refund_approved").value(),
                           timeout=ctx.sleep(timedelta(hours=2))):
    case ["ok", v]: ...
    case ["timeout", _]: raise TerminalError("approver never responded")

# separate handler:
@order_wf.handler()
async def approve_refund(ctx: WorkflowSharedContext, who: str) -> None:
    await ctx.promise("refund_approved").resolve(who)
```

For callbacks from **non-Restate** external systems, use `ctx.awakeable()` + the HTTP `POST /restate/awakeables/{id}/resolve` ingress.

## Concurrency

- `restate.gather(*futures)` — fan out multiple `ctx.run_typed` / `ctx.*_call` futures in parallel, await all.
- `restate.select(name1=fut1, name2=fut2, ...)` + `match` — race futures, get the first to complete (timeout-vs-result, approval-vs-cancel).

## Calling other services

- `ctx.workflow_call(handler, key, arg)` — req/resp to another Workflow.
- `ctx.workflow_send(handler, key, arg)` — fire-and-forget.
- `ctx.object_call` / `ctx.object_send` — VirtualObject equivalents.
- `ctx.service_call` / `ctx.service_send` — stateless Service equivalents.
- `ctx.generic_call` / `ctx.generic_send` — when the target handler isn't importable.

All `*_send` variants take an optional `idempotency_key`.

**Deadlock**: req/resp calls between two `exclusive` VirtualObject handlers can deadlock. Use `_send` or make one side `shared`.

## Versioning — in-flight long runs

Deployments are **immutable**. Register a new revision at a new URI; new invocations route to it, in-flight ones stay pinned to the old deployment until they complete. **The old deployment must stay reachable until drained** — for a 45-min workflow that means keeping the old pod up for ~an hour after rollout.

Hot-patching an in-flight invocation (`PUT /deployments/{id}`) only works if the new code is journal-compatible from the failure point onward — i.e. you didn't add/remove/reorder `ctx.run_typed` calls before that point.

## Dev loop

- Restate UI at `:9070` — invocation list, **journal view = step-by-step progress**, **State tab shows `ctx.set` values**.
- Run the SDK service on a fixed port with hot-reload re-registration against a local restate-server.
- `restate-server --wipe all` for a clean slate; `--wipe invocations` to keep deployments.
- Admin API `/query` (SQL over invocation/state tables) returns **Arrow IPC** by default — set `Accept: application/json` when curling it; the UI's SQL console hides this.

## Testing

`restate.create_test_harness(app, restate_image=PINNED_DIGEST, always_replay=True, disable_retries=True)` spins a real server in Docker. Pin the image digest. `always_replay=True` forces a full journal replay after every step — catches non-determinism bugs early. `disable_retries=True` makes transient errors fail-fast in tests. Drive via `httpx` against `harness.ingress_url`; assert on the `status` handler.

There is no mock-journal unit-replay mode in 0.15.0; tests are integration-level.

## Journal hygiene

Each `ctx.run_typed` result is persisted. For a 45-min poll loop at 30s intervals that's ~90 entries — fine, but **return small payloads** (a status enum + one or two fields), not full upstream API responses.

**Per-iteration entry count.** A poll loop that does `run("poll[n]")` + `set("poll_count")` + `set("task_state")` + `sleep()` writes **4 entries per iteration**. The `run` and `sleep` are unavoidable; the two `set`s are not. Only `set` when the value *changes* (or fold both into one `set("status", {phase, count, last})`). The journal already shows `poll[N]` so a separate `poll_count` key is redundant for observability.

**Action names must be deterministic per journal position** — replay compares `(position, name)` and a mismatch is **error 570 JOURNAL_MISMATCH**. The same name appearing at *different* positions is fine (so calling a `poll[{n}]` helper twice works), but the name string must not depend on anything that isn't itself journaled (no `f"poll-{time.time()}"`). Prefixing with phase (`payment_poll[{n}]`, `shipment_poll[{n}]`) keeps the UI readable.

## Anti-patterns (don't)

- Wrapping `datetime.now()` / `uuid4()` in `ctx.run_typed` — use `ctx.time()` / `ctx.uuid()`.
- `try/except` + `ctx.sleep` + re-call to retry a single action — use `RunOptions(max_attempts=...)`.
- `dict[str, Any]` for handler I/O — use Pydantic models.
- `except Exception:` / `except BaseException:` — swallows `SuspendedException`, breaks replay.
- Calling `ctx` inside a `ctx.run_typed` action.
- Not awaiting a `ctx.run_typed` immediately.
- Forgetting `inactivity_timeout`/`abort_timeout` on a service with multi-minute actions.
- Overwriting the same state key in a loop when you mean to accumulate.
- Action names that depend on non-journaled data (timestamps, env, random).
- Building deterministic inputs (config, client specs derived from the request) *inside* `ctx.run_typed` — only the actual side effect goes in the action.

---

# Rust SDK

Same server, same journal, same concepts — different syntax. `use restate_sdk::prelude::*;`. Runs on tokio. Reference: `restatedev/sdk-rust`, `restatedev/examples` (`rust/basics/src/`), `restatedev/documentation` (`code_snippets/rust/src/`).

## Declaring services

Macro on a **trait**, then implement on a struct:

```rust
#[restate_sdk::workflow]          // or ::service / ::object
trait OrderWorkflow {
    async fn run(req: Json<OrderRequest>) -> Result<Json<OrderResult>, HandlerError>;
    #[shared]
    async fn status() -> Result<Json<Option<OrderStatus>>, HandlerError>;
    #[shared]
    async fn approve_refund(who: String) -> Result<(), HandlerError>;
}

struct OrderWorkflowImpl;
impl OrderWorkflow for OrderWorkflowImpl {
    async fn run(&self, ctx: WorkflowContext<'_>, Json(req): Json<OrderRequest>)
        -> Result<Json<OrderResult>, HandlerError> { ... }
    async fn status(&self, ctx: SharedWorkflowContext<'_>)
        -> Result<Json<Option<OrderStatus>>, HandlerError> {
        Ok(Json(ctx.get::<Json<OrderStatus>>("status").await?.map(|Json(s)| s)))
    }
    async fn approve_refund(&self, ctx: SharedWorkflowContext<'_>, who: String)
        -> Result<(), HandlerError> {
        ctx.resolve_promise::<String>("refund_approved", who).await; Ok(())
    }
}
```

The macro injects `&self` and the context arg into the impl signatures; the trait declares only the wire-visible params. `#[shared]` on a trait method = read-only handler. Rename a service/handler with `#[name = "..."]`.

Context types: `Context<'_>` (Service), `ObjectContext<'_>` / `SharedObjectContext<'_>`, `WorkflowContext<'_>` / `SharedWorkflowContext<'_>`.

## Journaled side effects — `ctx.run`

Builder, not positional. Name is **optional** (Python's is required).

```rust
let receipt = ctx
    .run(|| charge_payment(client.clone(), order.clone()))
    .name("charge_payment")
    .retry_policy(
        RunRetryPolicy::default()
            .initial_delay(Duration::from_secs(2))
            .exponentiation_factor(2.0)
            .max_delay(Duration::from_secs(30))
            .max_attempts(3)
            .max_duration(Duration::from_secs(600)),
    )
    .await?;
```

**Default `RunRetryPolicy` has `max_duration` ≈ 50s** (`src/context/run.rs`) — much shorter than Python's infinite default. For long actions you *must* set `.max_duration(...)` or it terminals out.

The closure must be `FnMut() -> impl Future<Output = HandlerResult<O>> + Send`, with `O: Serialize + Deserialize`. Use `move` and clone captured handles in.

## Errors

`HandlerError` is the universal return error. Any `std::error::Error` `?`'d into it is **retryable**; wrap in `TerminalError` for non-retryable:

```rust
return Err(TerminalError::new("card declined").into());
return Err(TerminalError::new_with_code(412, "precondition failed").into());
```

Exhausted `RunRetryPolicy` → the awaited `ctx.run(...)` resolves to `Err(TerminalError)`. The `e.is_terminal()` helper distinguishes inside a `match`.

## Determinism built-ins

`ctx.rand_uuid()`, `ctx.rand()`, `ctx.sleep(Duration::...)`. There is no `ctx.time()` analogue today — wrap `SystemTime::now()` in `ctx.run(|| async { Ok(...) })` if you need a journaled timestamp (or read it from a poll result).

State: `ctx.set("k", v)`, `ctx.get::<T>("k").await?`, `ctx.clear("k")`, `ctx.key()` (the workflow/object key string).

## Signals & calls

```rust
let who: String = ctx.promise::<String>("refund_approved").await?;          // durable promise
let (id, fut) = ctx.awakeable::<Json<CallbackPayload>>();                   // external callback
ctx.object_client::<AccountClient>(account_id).lock().call().await?;        // typed client from macro
ctx.service_client::<EmailNotifierClient>().notify(Json(req)).send();       // fire-and-forget
```

Concurrency: `restate_sdk::select! { res = fut => .., _ = ctx.sleep(..) => .., on_cancel => .., else => .. }` — the `on_cancel` arm is Rust-only and is where saga compensation goes on invocation-cancel. Fan-out: `DurableFuturesUnordered::new()` + `.push(fut)` + `.next().await?` → `(idx, result)`. **Do not** use raw `futures::join!` / `tokio::select!` / `tokio::spawn` on `ctx` futures — suspension only works through the SDK combinators.

## Timeouts & retention

Set via `ServiceOptions` on `bind_with_options`, not on the trait or impl:

```rust
Endpoint::builder()
    .bind_with_options(
        OrderWorkflowImpl.serve(),
        ServiceOptions::new()
            .inactivity_timeout(Duration::from_secs(600))
            .abort_timeout(Duration::from_secs(720))
            .journal_retention(Duration::from_secs(86_400))
            .handler("run", HandlerOptions::new().workflow_retention(Duration::from_secs(86_400))),
    )
    .build()
```

`ServiceOptions` also carries handler-level invocation retry policy (`retry_policy_max_attempts`, `retry_policy_{pause,kill}_on_max_attempts`).

## Serving & testing

```rust
#[tokio::main]
async fn main() {
    HttpServer::new(
        Endpoint::builder()
            .bind(OrderWorkflowImpl.serve())
            .bind(SignupWorkflowImpl.serve())
            .build(),
    )
    .listen_and_serve("0.0.0.0:9080".parse().unwrap())
    .await;
}
```

Tests: `restate-sdk-testcontainers` crate (`sdk-rust/testcontainers/`): `TestEnvironment::new().with_container("restatedev/restate", TAG).start(endpoint).await?` → `StartedTestEnvironment { ingress_url() }`; drive via `reqwest`. Pin the image tag. **No `always_replay`/`disable_retries` knobs** — those are Python-harness-only.

The SDK serves its own protocol over hyper/h2 — it is **not connect-rpc-compatible**, so a Connect/gRPC stack won't compose with the Restate handler surface. Restate workflows live alongside, not behind, an RPC framework.

## Python ↔ Rust cheat sheet

| Concept | Python | Rust |
|---|---|---|
| Declare workflow | `wf = restate.Workflow("X")` + `@wf.main()` | `#[restate_sdk::workflow] trait X { ... }` |
| Shared handler | `@wf.handler()` | `#[shared]` on trait method |
| Journaled action | `await ctx.run_typed("name", fn, RunOptions(...), **kw)` | `ctx.run(\|\| fn()).name("name").retry_policy(...).await?` |
| Retry policy | `RunOptions(max_attempts=, initial_retry_interval=, ...)` | `RunRetryPolicy::default().max_attempts()...` |
| Default retry | infinite | `max_duration ≈ 50s` |
| Terminal error | `raise TerminalError("...")` | `Err(TerminalError::new("...").into())` |
| Serde | Pydantic auto-detected | `Json<T>` newtype (serde_json) |
| State get/set | `ctx.set("k", v)` / `await ctx.get("k")` | `ctx.set("k", v)` / `ctx.get::<T>("k").await?` |
| Time | `await ctx.time()` | (none — wrap `SystemTime::now` in `ctx.run`) |
| UUID/random | `ctx.uuid()` / `ctx.random()` | `ctx.rand_uuid()` / `ctx.rand()` |
| Promise | `ctx.promise("name").value()` | `ctx.promise::<T>("name").await?` |
| Awakeable | `ctx.awakeable()` | `ctx.awakeable::<T>()` |
| Race/gather | `restate.select(...)` / `restate.gather(...)` | `restate_sdk::select!` (+`on_cancel`) / `DurableFuturesUnordered` |
| Retry-after hint | `RetryableError(..., retry_after=td)` | (none — plain retryable error) |
| Call other svc | `ctx.workflow_call(h, key, arg)` | `ctx.workflow_client::<C>(key).h(arg).call().await?` |
| Inactivity/abort | `Workflow("X", inactivity_timeout=...)` | `bind_with_options(.., ServiceOptions::new().inactivity_timeout(..))` |
| Serve | `restate.app([svc, ...])` | `Endpoint::builder().bind(...).build()` + `HttpServer` |
| Test harness | `create_test_harness(app, always_replay=True)` | `restate-sdk-testcontainers` (no `always_replay`) |

Crate `restate-sdk` 0.9.0, edition 2024, MSRV 1.90. `use restate_sdk::prelude::*`. Default features `http_server,rand,uuid,tracing-span-filter`; opt-in `schemars` (puts JSON schema in service discovery), `lambda`. There is no `docs/develop/rust/` — rustdoc + `restatedev/documentation` `code_snippets/rust/src/` are the documentation.

When porting Python → Rust, journal semantics are identical so the determinism and saga rules carry over verbatim. The foot-guns that *change*: (1) `RunRetryPolicy` defaults to ~50s `max_duration` — set it explicitly on every long action; (2) no `ctx.time()` — wrap `SystemTime::now()` in `ctx.run`; (3) timeouts go on `ServiceOptions` at bind time, not on the trait; (4) the test harness has no `always_replay` knob, so determinism bugs surface later; (5) concurrency must go through `restate_sdk::select!`/`DurableFuturesUnordered`, never raw tokio.
