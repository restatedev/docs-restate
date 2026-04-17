# Go SDK Reference

## Setup

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

### SDK installation

```shell
go get github.com/restatedev/sdk-go
```

### Minimal scaffold

```go
package main

import (
  "context"
  "fmt"
  "log"
  restate "github.com/restatedev/sdk-go"
  server "github.com/restatedev/sdk-go/server"
)

type MyService struct{}

func (MyService) MyHandler(ctx restate.Context, greeting string) (string, error) {
  return fmt.Sprintf("%s!", greeting), nil
}

func main() {
  if err := server.NewRestate().
    Bind(restate.Reflect(MyService{})).
    Start(context.Background(), "0.0.0.0:9080"); err != nil {
    log.Fatal(err)
  }
}
```

### Register and invoke

```shell
# Register the service with Restate Server
restate deployments register http://localhost:9080

# Invoke the handler
curl localhost:8080/MyService/MyHandler --json '"World"'
```

---

## Service types

Define handlers as exported methods on a struct. `restate.Reflect(MyService{})` discovers handlers via reflection. The struct name becomes the service name.

### Service (stateless)

- Methods receive `restate.Context`. No state, unlimited concurrency.
- Callable at `<RESTATE_INGRESS>/MyService/MyHandler`.

### Virtual Object (stateful, keyed)

```go
type MyObject struct{}

func (MyObject) MyHandler(ctx restate.ObjectContext, greeting string) (string, error) {
  return fmt.Sprintf("%s %s!", greeting, restate.Key(ctx)), nil
}

func (MyObject) MyConcurrentHandler(ctx restate.ObjectSharedContext, greeting string) (string, error) {
  return fmt.Sprintf("%s %s!", greeting, restate.Key(ctx)), nil
}
```

- Exclusive handlers (default): receive `restate.ObjectContext`. One invocation at a time per key.
- Shared handlers: receive `restate.ObjectSharedContext`. Concurrent, read-only.
- Access the key via `restate.Key(ctx)`.

### Workflow (exactly-once per ID)

```go
type MyWorkflow struct{}

func (MyWorkflow) Run(ctx restate.WorkflowContext, req string) (string, error) {
  return "success", nil
}

func (MyWorkflow) InteractWithWorkflow(ctx restate.WorkflowSharedContext) error {
  return nil
}
```

- `Run` executes exactly once per workflow ID. Uses `restate.WorkflowContext`.
- Additional handlers use `restate.WorkflowSharedContext`. Run concurrently.
- Access the workflow ID via `restate.Key(ctx)`.

---

## State

Available in Virtual Objects and Workflows only. All state operations are **package-level functions**, not methods on ctx.

```go
stateKeys, err := restate.Keys(ctx)                          // List all keys
myString, err := restate.Get[*string](ctx, "my-string-key")  // nil if not set
myNumber, err := restate.Get[int](ctx, "my-number-key")      // zero value if not set
restate.Set(ctx, "my-key", "my-new-value")                   // Set
restate.Clear(ctx, "my-key")                                 // Clear one key
restate.ClearAll(ctx)                                        // Clear all
```

Use `restate.Get[*string]` (pointer) when distinguishing "not set" (nil) from "set to zero value" matters. Use `restate.Get[int]` (value) when zero value is acceptable.

---

## Communication

### Request-response calls

```go
// Service: restate.Service[ResponseType](ctx, "ServiceName", "HandlerName").Request(arg)
response, err := restate.Service[string](ctx, "MyService", "MyHandler").Request("Hi")

// Virtual Object: restate.Object[ResponseType](ctx, "ObjectName", key, "HandlerName").Request(arg)
response, err := restate.Object[string](ctx, "MyObject", "Mary", "MyHandler").Request("Hi")

// Workflow: restate.Workflow[ResponseType](ctx, "WorkflowName", workflowId, "HandlerName").Request(arg)
response, err := restate.Workflow[bool](ctx, "MyWorkflow", "my-workflow-id", "Run").Request("Hi")
```

The type parameter (e.g., `[string]`) specifies the expected response type.

### One-way messages (fire-and-forget)

```go
restate.ServiceSend(ctx, "MyService", "MyHandler").Send("Hi")
restate.ObjectSend(ctx, "MyObject", "Mary", "MyHandler").Send("Hi")
restate.WorkflowSend(ctx, "MyWorkflow", "my-workflow-id", "Run").Send("Hi")
```

### Delayed messages

```go
restate.ServiceSend(ctx, "MyService", "MyHandler").
  Send("Hi", restate.WithDelay(5*time.Hour))
```

Same pattern for `ObjectSend` and `WorkflowSend`.

### Idempotency keys

```go
restate.ServiceSend(ctx, "MyService", "MyHandler").
  Send("Hi", restate.WithIdempotencyKey("my-idempotency-key"))
```

---

## Side effects (restate.Run)

Wrap all non-deterministic operations (API calls, DB writes, HTTP requests, file I/O) in `restate.Run` to journal their results.

```go
result, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
  return doDbRequest()
})
if err != nil {
  return err
}
```

### With retry policy

```go
result, err := restate.Run(ctx,
  func(ctx restate.RunContext) (string, error) {
    return doDbRequest()
  },
  restate.WithMaxRetryDuration(time.Second*10),
  restate.WithInitialRetryInterval(time.Millisecond*100),
  restate.WithRetryIntervalFactor(2.0),
  restate.WithName("my_db_request"),
)
if err != nil {
  return err
}
```

### Async side effects (non-blocking)

```go
call1 := restate.RunAsync(ctx, func(ctx restate.RunContext) (UserData, error) {
  return fetchUserData(123)
})
user, err := call1.Result()
```

CRITICAL: No Restate context operations inside `restate.Run` blocks. Only use methods on the provided `restate.RunContext`. No `restate.Get`, `restate.Set`, `restate.Sleep`, service calls, or nested `restate.Run`.

---

## Deterministic helpers

Never use `rand.Int()`, `time.Now()`, or `uuid.New()` directly. These produce different values on replay.

```go
// Deterministic UUID
uuid := restate.UUID(ctx)

// Deterministic random numbers
randomInt := restate.Rand(ctx).Uint64()
randomFloat := restate.Rand(ctx).Float64()

// Use as a math/rand/v2 source
mathRandV2 := rand.New(restate.RandSource(ctx))
```

For current time, wrap `time.Now()` in `restate.Run`:

```go
now, err := restate.Run(ctx, func(ctx restate.RunContext) (time.Time, error) {
  return time.Now(), nil
})
```

---

## Timers (durable sleep)

```go
if err := restate.Sleep(ctx, 30*time.Second); err != nil {
  return "", err
}
```

Survives crashes and restarts. No limit on duration, but long sleeps in exclusive handlers block other calls for that key.

### After (non-blocking timer future)

```go
sleepFuture := restate.After(ctx, 30*time.Second)
// ... do other work ...
if err := sleepFuture.Done(); err != nil {
  return "", err
}
```

---

## Awakeables

Pause a handler until an external system signals completion.

```go
awakeable := restate.Awakeable[string](ctx)
awakeableId := awakeable.Id()

// Send the ID to an external system (inside restate.Run)
restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
  return requestHumanReview(awakeableId)
})

review, err := awakeable.Result() // Wait for the external signal

// Resolve/reject from another handler
restate.ResolveAwakeable(ctx, awakeableId, "Looks good!")
restate.RejectAwakeable(ctx, awakeableId, fmt.Errorf("Cannot do review"))
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

---

## Durable promises

Cross-handler signaling within a Workflow. No ID management needed.

```go
// Wait for a promise (in the Run handler)
review, err := restate.Promise[string](ctx, "review").Result()

// Resolve from an interaction handler
err := restate.Promise[string](ctx, "review").Resolve(review)
```

---

## Concurrency

CRITICAL: Use `restate.Wait` / `restate.WaitFirst`, NOT goroutines, channels, or Go `select` statements. Native concurrency primitives are not journaled and break deterministic replay.

### WaitFirst (race, first to complete)

```go
sleepFuture := restate.After(ctx, 30*time.Second)
callFuture := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi")

fut, err := restate.WaitFirst(ctx, sleepFuture, callFuture)
if err != nil { return "", err }
switch fut {
case sleepFuture:
  sleepFuture.Done()
  return "sleep won", nil
case callFuture:
  result, _ := callFuture.Response()
  return fmt.Sprintf("call won: %s", result), nil
}
```

### Wait (all, iterate over completions)

```go
callFuture1 := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi")
callFuture2 := restate.Service[string](ctx, "MyService", "MyHandler").RequestFuture("hi again")

for fut, err := range restate.Wait(ctx, callFuture1, callFuture2) {
  if err != nil { return "", err }
  response, _ := fut.(restate.ResponseFuture[string]).Response()
  // process response
}
```

### Parallel execution (futures)

```go
call1 := restate.RunAsync(ctx, func(ctx restate.RunContext) (UserData, error) {
  return fetchUserData(123)
})
call2 := restate.Service[int](ctx, "Analytics", "Calc").RequestFuture(123)
user, _ := call1.Result()
metrics, _ := call2.Response()
```

---

## Invocation management

### Get invocation ID from a send

```go
invocationId := restate.ServiceSend(ctx, "MyService", "MyHandler").
  Send("Hi", restate.WithIdempotencyKey("my-key")).
  GetInvocationId()
```

### Attach to a running invocation

```go
response, err := restate.AttachInvocation[string](ctx, invocationId).Response()
if err != nil {
  return err
}
```

### Cancel an invocation

```go
restate.CancelInvocation(ctx, invocationId)
```

---

## Error handling

### Terminal errors (no retry)

```go
return restate.TerminalError(fmt.Errorf("Something went wrong."), 500)
```

`restate.TerminalError` is a function that wraps an error with an optional HTTP status code. Any other returned error will be retried infinitely with exponential backoff.

Catch terminal errors from `restate.Run` to handle permanent failures and execute compensations (see sagas guide).

---

## SDK clients (external invocations)

Call Restate services from outside of a Restate handler:

```go
import restateingress "github.com/restatedev/sdk-go/ingress"

restateClient := restateingress.NewClient("http://localhost:8080")

// Service[RequestType, ResponseType](client, "ServiceName", "HandlerName")
result, err := restateingress.Service[string, string](restateClient, "MyService", "MyHandler").
  Request(context.Background(), "Hi")

// Object[RequestType, ResponseType](client, "ObjectName", key, "HandlerName")
restateingress.Object[string, string](restateClient, "MyObject", "Mary", "MyHandler").
  Request(context.Background(), "Hi")
```

---

## Context propagation

```go
// Wrap external contexts (e.g., OpenTelemetry)
ctx = restate.WrapContext(ctx, externalCtx)

// Propagate custom values
ctx = restate.WithValue(ctx, myKey, "my-value")
```

---

## Go-specific pitfalls (CRITICAL)

### 1. All Restate operations are package-level functions

Restate operations are NOT methods on ctx. Always use `restate.Run(ctx, ...)`, `restate.Get[T](ctx, ...)`, `restate.Set(ctx, ...)`, `restate.Sleep(ctx, ...)`, etc.

```go
// BAD - these do not exist
ctx.Run(...)
ctx.Get(...)
ctx.Sleep(...)

// GOOD
restate.Run(ctx, ...)
restate.Get[string](ctx, ...)
restate.Sleep(ctx, 10*time.Second)
```

### 2. Always handle errors

Every Restate operation returns an error. Never use `_` to discard errors from Restate operations. Always check `err != nil`.

### 3. restate.Reflect() discovers handlers from struct methods

Only exported methods with valid signatures are discovered. Methods must have the correct context type as the first parameter. Check the package documentation for allowed signatures.

### 4. Do not use goroutines, channels, or select for Restate operations

Use `restate.WaitFirst` / `restate.Wait` instead. Goroutines and channels are safe ONLY inside `restate.Run` blocks.

### 5. restate.Get returns pointer types for optional state

Use `restate.Get[*string]` to distinguish "not set" (nil) from "set to empty string". Use value types like `restate.Get[int]` when zero value is acceptable.

### 6. TerminalError is a function, not a type

`restate.TerminalError(fmt.Errorf("bad input"), 400)` -- do not construct as a struct literal.

### 7. Use restate.Void for handlers with no return value

`restate.Void{}` serializes to nil bytes. Use for `restate.Run` blocks and calls with no meaningful return.

### 8. No ctx operations inside restate.Run blocks

Read state before `restate.Run`, then use the value inside. The `ctx` parameter inside `restate.Run` is `RunContext`, not the Restate context.

### 9. Code generation alternative

The Go SDK supports defining handlers and types via Protocol Buffers for stronger type safety.

---

## Further resources

- For testing: use the bundled restate-docs MCP server
- For detailed API: use MCP or GoDoc (https://pkg.go.dev/github.com/restatedev/sdk-go)
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples
