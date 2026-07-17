# Go SDK Reference

## Setup

The Go SDK 1.x requires Go 1.25 or newer.

### Restate Server

Install the Restate Server via one of:

```shell
# Docker (recommended)
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
go get github.com/restatedev/sdk-go@latest
```

The testing utilities are a separately versioned module:

```shell
go get github.com/restatedev/sdk-go/testing@latest
```

Experimental modules such as `x/mocks` and `x/protoc-gen-go-restate` are versioned independently from the stable SDK module.

### Minimal scaffold

```go {"CODE_LOAD::go/develop/myservice/main.go"}
```

### Register and invoke

Start the service, then register and invoke:

```shell
# Register the service with Restate Server
restate deployments register http://localhost:9080

# Invoke the handler
curl localhost:8080/MyService/MyHandler --json '"World"'
```

---

## Core Concepts

- Restate provides durable execution: if a handler crashes or the process restarts, Restate replays the handler from the last completed step, not from scratch.
- All handlers receive a Context object (`ctx`) as their first argument. Use restate actions with the ctx for all I/O and side effects.
- Handlers take one optional JSON-serializable input parameter and return one JSON-serializable output.

---

## Service types

Define handlers as exported methods on a struct. `restate.Reflect(MyService{})` discovers handlers via reflection. The struct name becomes the service name.

### Service (stateless)

See minimal scaffold above.

### Virtual Object (stateful, keyed)

```go {"CODE_LOAD::go/develop/myvirtualobject/main.go"}
```

- Exclusive handlers (default): receive `restate.ObjectContext`. One invocation at a time per key.
- Shared handlers: receive `restate.ObjectSharedContext`. Concurrent, read-only.
- Access the key via `restate.Key(ctx)`.

### Workflow (exactly-once per ID)

```go {"CODE_LOAD::go/develop/myworkflow/main.go"}
```

- `Run` executes exactly once per workflow ID. Uses `restate.WorkflowContext`.
- Additional handlers use `restate.WorkflowSharedContext`. Run concurrently.
- Access the workflow ID via `restate.Key(ctx)`.

---

## State

Never use global variables for state -- it is not durable across restarts. Use Restate actions instead. Available in Virtual Objects and Workflows only.

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#state"}
```

Use `restate.Get[*string]` (pointer) when distinguishing "not set" (nil) from "set to zero value" matters. Use `restate.Get[int]` (value) when zero value is acceptable.

---

## Service Communication

### Request-response calls

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#service_calls"}
```

### One-way messages (fire-and-forget)

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#sending_messages"}
```

### Delayed messages

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#delayed_messages"}
```

### Scopes and limit keys

For Restate 1.7 scope-based concurrency limits, load `references/flow-control-and-scopes.md`. Go SDK 1.0 uses `restate.WithScope(...)` on the client and `restate.WithLimitKey(...)` on the request or send.

## Side effects (restate.Run)

Wrap all non-deterministic operations (API calls, DB writes, HTTP requests, file I/O) in `restate.Run` to journal their results.

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#durable_steps"}
```

### Async side effects (non-blocking)

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#async_run"}
```

- No Restate context actions within `restate.Run()`.
- Always supply a name, used for observability and debugging.

---

## Deterministic helpers

Never use `rand.Int()`, `time.Now()`, or `uuid.New()` directly. These produce different values on replay.

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#deterministic_helpers"}
```

---

## Timers (durable sleep)

Never use `time.Sleep()`. Use Restate's sleep instead for durable delays that survive crashes and restarts:

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#durable_timers"}
```

No limit on duration, but long sleeps in exclusive handlers block other calls for that key.

### After (non-blocking timer future)

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#async_sleep"}
```

---

## Awakeables

Pause a handler until an external system signals completion.

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#awakeables"}
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

Or from another handler:

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#awakeables_resolution"}
```

---

## Durable promises

Cross-handler signaling within a Workflow. No ID management needed.

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#workflow_promises"}
```

---

## Concurrency

CRITICAL: Use `restate.Wait` / `restate.WaitFirst`, NOT goroutines, channels, or Go `select` statements. Native concurrency primitives are not journaled and break deterministic replay.

### WaitFirst (race, first to complete)

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#wait_first"}
```

### Wait (all, iterate over completions)

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#wait_all"}
```

---

## Invocation management

### Idempotency Keys

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#idempotency"}
```

This returns the invocation ID.

### Attach to a running invocation

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#attach"}
```

### Cancel an invocation

```go {"CODE_LOAD::go/develop/skillsmd/actions.go#cancel"}
```

---

## Error handling

Go SDK 1.0 uses explicit error types:

- `restate.TerminalError` completes the invocation or `Run` with a failure. It carries a code, message, and optional metadata.
- `restate.RetryableError` ends the current attempt and lets Restate retry. It carries a code and message.

Operations that can fail only terminally, including `Get`, `Keys`, `Sleep`, `Wait`, and `WaitFirst`, return `restate.TerminalError` instead of a generic `error`. `TerminalError` still implements `error`.

### Terminal errors (no retry)

```go {"CODE_LOAD::go/develop/errorhandling.go#here"}
```

`TerminalError` is a type, not a constructor. Create one with `restate.ToTerminalError(err, options...)` or `restate.TerminalErrorf(...)`. The pre-1.0 `restate.TerminalError(err)` constructor no longer exists.

Use `restate.WithErrorCode(...)` and `restate.WithMetadata(...)` when converting an error. Use `restate.IsTerminalError(...)` or `restate.AsTerminalError(...)` when inspecting a returned error.

Create retryable errors with `restate.ToRetryableError(...)` or `restate.RetryableErrorf(...)`. Other non-terminal failures are retried with exponential backoff by default.

Catch terminal errors from `restate.Run` to handle permanent failures and execute compensations (see sagas guide).

---

## SDK clients (external invocations)

Call Restate services from outside of a Restate handler:

```go {"CODE_LOAD::go/develop/skillsmd/clients.go#here"}
```

## Go-specific pitfalls (CRITICAL)

### 1. All Restate operations are package-level functions

Restate operations are NOT methods on ctx. Always use `restate.Run(ctx, ...)`, `restate.Get[T](ctx, ...)`, `restate.Set(ctx, ...)`, `restate.Sleep(ctx, ...)`, etc.

### 2. Always handle returned errors

Never use `_` to discard an error from a Restate operation. Check `err != nil` and propagate or handle the `TerminalError`. State writes such as `restate.Set` and `restate.Clear` do not return errors.

### 3. restate.Reflect() discovers handlers from struct methods

Only exported methods with valid signatures are discovered. Methods must have the correct context type as the first parameter. Check the package documentation for allowed signatures.

### 4. Do not use goroutines, channels, or select for Restate operations

Use `restate.WaitFirst` / `restate.Wait` instead. Goroutines and channels are safe ONLY inside `restate.Run` blocks.

### 5. Use restate.Void for handlers with no return value

`restate.Void{}` serializes to nil bytes. Use for `restate.Run` blocks and calls with no meaningful return.

### 6. Code generation alternative

The Go SDK supports defining handlers and types via Protocol Buffers for stronger type safety.

### 7. Go SDK 1.0 migration checks

When upgrading a 0.x project, apply the official migration guide and verify all of these changes:

- Replace `restate.TerminalError(err)` with `restate.ToTerminalError(err)`.
- Replace `restate.Rand(ctx).UUID()` with `restate.UUID(ctx)`.
- Treat `restate.Rand(ctx)` as a deterministic `*math/rand/v2.Rand`.
- Replace `WithPayloadCodec` with `WithCodec`. Use `WithInputCodec` and `WithOutputCodec` when the directions differ.
- Update invocation retry option names, including `WithMaxRetryAttempts`, `WithInitialRetryInterval`, `WithMaxRetryInterval`, and `WithRetryIntervalFactor`.
- Import ingress options such as `WithHttpClient` and `WithAuthKey` from `github.com/restatedev/sdk-go/ingress`.
- Add `github.com/restatedev/sdk-go/testing` explicitly because it is no longer part of the core module's dependency graph.
- Update moved optional imports to `x/mocks`, `logging`, and `x/protoc-gen-go-restate` when used.

Migration guide: https://github.com/restatedev/sdk-go/blob/main/MIGRATION.md

---

## Testing

Package: `github.com/restatedev/sdk-go/testing` (a separate, Testcontainers-based Go module)

Tests run against a real Restate Server in Docker. 

```go {"CODE_LOAD::go/develop/testing/t.go#here"} 
```

Use tests also to catch non-determinism bugs that unit tests miss: if handler code is non-deterministic, replay produces different results and the test fails.
You can do this by setting the environment variable `RESTATE_WORKER__INVOKER__INACTIVITY_TIMEOUT=0m` for the Restate Server.

---

## Further resources

- For detailed API: use the bundled restate-docs MCP server or GoDoc (https://pkg.go.dev/github.com/restatedev/sdk-go)
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples
