---
name: restate-skill-plugin
description: >
  Build, implement, run, and test Restate durable services, virtual objects,
  workflows, and AI agents across TypeScript, Python, Java, and Go.
  This skill should be used when the user mentions "restate", "durable execution",
  "ctx.run", "virtual object", "restate service", "restate workflow",
  "durable agent", "TerminalError", "restate-sdk", "@restatedev",
  "durableCalls", "DurableRunner", "RestatePlugin", "RestateAgent",
  or wants to build resilient backend services, AI agents, or workflows
  with automatic failure recovery. Also use when converting existing applications
  or migrating from workflow orchestrators to Restate. 
  Use proactively when a project contains restate dependencies in
  package.json, requirements.txt, pyproject.toml, pom.xml, build.gradle, or go.mod.
---

# Restate

## What is Restate

Restate is a durable execution runtime. It makes application code automatically survive crashes, recover from failures, and resume exactly where it left off.

### Use cases

- **Durable backends**: Handlers that survive crashes and resume from where they left off
- **AI agents**: LLM calls and tool executions that persist across failures, with automatic retry and recovery
- **Workflows and approvals**: Multi-step processes that execute exactly-once per ID, with human-in-the-loop interaction
- **Microservice orchestration**: Reliable service-to-service communication with automatic retries and exactly-once semantics
- **Stateful entities**: User sessions, shopping carts, agents, counters with persistent state and no external database

### Durable execution

Restate records every step of a handler in a **journal**. If the handler crashes mid-execution, Restate replays from the journal, skipping already-completed steps. This means:

- Completed side effects are not re-executed on recovery
- Non-deterministic operations (API calls, DB writes, random values) **must be wrapped** so their results get journaled
- The handler code must be deterministic between journal entries

Result: code that looks like normal functions but survives infrastructure failures, API timeouts, and process crashes.

### Programming model: Server + Services

**Restate Server** is a single Rust binary that sits in front of services:
- Manages invocations, journals, state, timers, and inter-service communication
- Port 8080: ingress (receives requests)
- Port 9070: admin UI and API

**Services** are regular applications using the Restate SDK:
- Expose HTTP endpoints that Restate discovers and proxies
- Contain handlers (durable functions)
- SDKs available for TypeScript, Python, Java, and Go

### Service types

| Type | State | Concurrency | When to use |
|------|-------|-------------|-------------|
| **Service** | None | Unlimited parallel | Stateless handlers: API endpoints, ETL, sagas, background jobs |
| **Virtual Object** | K/V per key | Single writer per key + concurrent readers | Stateful entities: user sessions, shopping carts, agents, counters |
| **Workflow** | Per workflow ID | One `run` + concurrent signals/queries | Multi-step processes: approvals, onboarding, exactly-once orchestration |

**Service**: A collection of stateless handlers. Each invocation is independent. No shared state between calls. Use for durable orchestration logic, sagas, and background jobs.

**Virtual Object**: A stateful, key-addressed entity (like an actor). Each key has isolated K/V state and a processing queue. Exclusive handlers process one at a time per key (single-writer guarantee). Shared handlers run concurrently for read-only access.

**Workflow**: Runs exactly once per workflow ID. Has a `run` handler (main logic) and interaction handlers for external signals and queries. Durable promises allow pausing execution and resuming when signals arrive.

## Detect context and route

Before starting, scan the project to understand the context:

1. **Detect SDK**:
   - `package.json` with `@restatedev/restate-sdk` -> TypeScript
   - `requirements.txt` or `pyproject.toml` with `restate-sdk` -> Python
   - `pom.xml` or `build.gradle` with `dev.restate` -> Java
   - `go.mod` with `github.com/restatedev/sdk-go` -> Go
   - If no SDK dependency found, check for project files (package.json, go.mod, etc.) to determine language, then ask the user to confirm

2. **Detect existing Restate code**: Grep for `@restatedev`, `restate-sdk`, `dev.restate.sdk`, `github.com/restatedev`

3. **Detect AI frameworks**: `@ai-sdk/`, `openai-agents`, `google-adk`, `pydantic-ai`

4. **Detect workflow orchestrators**: `temporalio`, `@temporalio`, `camunda`, `aws-cdk/aws-stepfunctions`, `inngest`

## What to load when

Load references based on what the user needs. Do not enforce a fixed sequence.

| User needs | Reference to load |
|---|---|
| Design a new application, choose service types, plan architecture | `references/design-and-architecture.md` |
| Migrate an existing application or workflow orchestrator to Restate | `references/migrate-to-restate.md` (then also `design-and-architecture.md` for keying/deadlocks) |
| Implement in TypeScript (setup, API, pitfalls) | `references/ts/api-and-pitfalls.md` |
| Implement in Python | `references/python/api-and-pitfalls.md` |
| Implement in Java | `references/java/api-and-pitfalls.md` |
| Implement in Go | `references/go/api-and-pitfalls.md` |
| Build AI agent with Vercel AI SDK | `references/ts/restate-vercel-ai-agents.md` |
| Build AI agent with OpenAI Agents SDK | `references/python/restate-openai-agents-agents.md` |
| Build AI agent with Google ADK | `references/python/restate-google-adk-agents.md` |
| Build AI agent with Pydantic AI | `references/python/restate-pydantic-ai-agents.md` |
| Debug errors, stuck invocations, journal mismatches | `references/debug-applications.md` |
| Testing, deployment, server config, Kafka, advanced topics | Use the bundled **restate-docs** MCP server |
| Code examples and templates | `github.com/restatedev/examples` (per-SDK), `github.com/restatedev/ai-examples` (AI agents) |

## Universal pitfalls

These rules apply across all SDKs. Violations cause hard-to-debug replay failures.

### Rule 1: Wrap ALL side effects in ctx.run()

Every non-deterministic operation (API calls, DB writes, HTTP requests, file I/O) must be wrapped. Without wrapping, the operation re-executes on every replay, causing duplicates.

| SDK | Pattern |
|-----|---------|
| TypeScript | `const result = await ctx.run("label", async () => callAPI());` |
| Python | `result = await ctx.run("label", lambda: call_api())` |
| Java | `String result = ctx.run("label", String.class, () -> callAPI());` |
| Go | `result, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) { return callAPI(), nil })` |

The first argument is a descriptive label for observability. Return values must be JSON-serializable.

### Rule 2: Use deterministic helpers

Never use native random, UUID, or time functions. They return different values on replay.

| Need | TypeScript | Python | Java | Go |
|------|-----------|--------|------|-----|
| Random float | `ctx.rand.random()` | `ctx.random()` | `ctx.random().nextFloat()` | `restate.Rand(ctx).Float64()` |
| UUID | `ctx.rand.uuidv4()` | `ctx.uuid4()` | `ctx.random().nextUUID()` | `restate.UUID(ctx)` |
| Current time | `await ctx.date.now()` | `await ctx.now()` | `ctx.timer().millisSinceEpoch()` | Wrap `time.Now()` in `restate.Run` |

### Rule 3: Use Restate concurrency combinators

Native concurrency primitives are not journaled. Using them breaks deterministic replay.

| Native (WRONG) | Restate (CORRECT) | SDK |
|----------------|-------------------|-----|
| `Promise.all/race/any` | `RestatePromise.all/race/any` | TypeScript |
| `asyncio.gather` / `asyncio.wait` | `restate.gather` / `restate.select` | Python |
| `CompletableFuture` methods | `DurableFuture.all` / `DurableFuture.any` | Java |
| goroutines / channels | `restate.Wait` / `restate.WaitFirst` | Go |

### Rule 4: Use durable sleep

Native sleep functions are not persisted. They restart from zero after a crash.

| Native (WRONG) | Restate (CORRECT) |
|----------------|-------------------|
| `setTimeout`, `new Promise(r => setTimeout(r, ms))` | `await ctx.sleep({ seconds: 30 })` (TypeScript) |
| `asyncio.sleep()`, `time.sleep()` | `await ctx.sleep(timedelta(seconds=30))` (Python) |
| `Thread.sleep()` | `ctx.sleep(Duration.ofSeconds(30))` (Java) |
| `time.Sleep()` | `restate.Sleep(ctx, 30*time.Second)` (Go) |

### Rule 5: Error handling

Restate retries **all** errors infinitely by default with exponential backoff.

- Use `TerminalError` (TypeScript, Python, Go) or `TerminalException` (Java) for permanent failures that should not be retried (invalid input, business rule violations, authorization failures).
- **Python**: NEVER use bare `except:` or `except Exception:` in handlers. This catches Restate SDK internal exceptions (suspension signals, terminal errors), causing silent failures. Always catch specific exception types.
- **AI agents**: ALWAYS set `maxRetryAttempts` on LLM calls. Without it, a failing LLM call retries infinitely, burning money.

### Rule 6: Other constraints

- **No ctx operations inside ctx.run()**: `ctx.run()` blocks cannot contain `ctx.get`, `ctx.set`, `ctx.sleep`, service calls, or nested `ctx.run`. Only plain code and external calls.
- **No global mutable state**: Use `ctx.get()` / `ctx.set()` in Virtual Objects and Workflows for durable state.
- **Return values from ctx.run() must be serializable**: JSON by default. Use custom serializers for complex types.

## Verification checklist

Before submitting work, verify:

- [ ] All side effects (API calls, DB writes, HTTP) wrapped in `ctx.run()`
- [ ] No native `Math.random()`, `Date.now()`, `random.random()`, `time.time()` etc.
- [ ] No native `setTimeout`, `asyncio.sleep`, `Thread.sleep`, `time.Sleep`
- [ ] Restate concurrency combinators used, not native `Promise.all`/`asyncio.gather`/etc.
- [ ] No `ctx` operations inside `ctx.run()` blocks
- [ ] `TerminalError`/`TerminalException` for non-retryable failures
- [ ] Python: no bare `except:` or `except Exception:`
- [ ] AI agents: `maxRetryAttempts` set on all LLM calls
- [ ] Virtual Objects: no deadlock cycles in exclusive handler call graph
- [ ] Service registered with `restate deployments register`
- [ ] Tested via curl or Restate UI, journal entries visible in UI
