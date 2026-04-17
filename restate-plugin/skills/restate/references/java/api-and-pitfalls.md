# Java SDK Reference: API and Pitfalls

## Setup

### Install Restate Server

Ask the user for preferred installation method:

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

### Install SDK

**Gradle (build.gradle.kts):**
```kotlin
dependencies {
    implementation("dev.restate:sdk-api:2.0.0")
    implementation("dev.restate:sdk-http-vertx:2.0.0")
    testImplementation("dev.restate:sdk-testing:2.0.0") // optional: testing
}
```

**Maven (pom.xml):**
```xml
<dependency>
    <groupId>dev.restate</groupId>
    <artifactId>sdk-api</artifactId>
    <version>2.0.0</version>
</dependency>
<dependency>
    <groupId>dev.restate</groupId>
    <artifactId>sdk-http-vertx</artifactId>
    <version>2.0.0</version>
</dependency>
```

`sdk-api` contains annotations and context interfaces. `sdk-http-vertx` provides the HTTP server.

### Minimal Scaffold

```java
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.Context;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

@Service
public class MyService {

    @Handler
    public String greet(Context ctx, String name) {
        return "Hello " + name + "!";
    }

    public static void main(String[] args) {
        RestateHttpServer.listen(
            Endpoint.bind(new MyService())
        );
    }
}
```

### Register and Invoke

Start the service, then register and invoke:

```bash
restate deployments register http://localhost:9080
curl localhost:8080/MyService/greet --json '"World"'
```

---

## Core Concepts

- Restate provides durable execution: if a handler crashes or the process restarts, Restate replays the handler from the last completed step, not from scratch.
- All handlers receive a Context object (`ctx`) as their first parameter. Use ctx methods for all I/O and side effects.
- Handlers take one optional JSON-serializable input parameter and return one JSON-serializable output.
- Code generation produces typed client classes (e.g., `MyServiceClient`) from annotated service definitions.

---

## Service Types

### Service (Stateless)

```java
@Service
public class MyService {
    @Handler
    public String myHandler(Context ctx, String greeting) {
        return greeting + "!";
    }
}
```

Bind and serve: `RestateHttpServer.listen(Endpoint.bind(new MyService()));`

### Virtual Object (Stateful, Keyed)

```java
@VirtualObject
public class MyObject {
    @Handler
    public String myHandler(ObjectContext ctx, String greeting) {
        return greeting + " " + ctx.key() + "!";
    }

    @Shared
    @Handler
    public String myConcurrentHandler(SharedObjectContext ctx, String greeting) {
        return greeting + " " + ctx.key() + "!";
    }
}
```

- **Exclusive handlers** (`@Handler` without `@Shared`): only one executes at a time per key. Use for writes.
- **Shared handlers** (`@Shared @Handler`): run concurrently per key. Use for reads.

### Workflow

```java
@Workflow
public class MyWorkflow {
    @Handler
    public String run(WorkflowContext ctx, String req) {
        return "success";
    }

    @Shared
    @Handler
    public void interactWithWorkflow(SharedWorkflowContext ctx) {
        // resolve a promise the workflow is waiting on
    }
}
```

- `run` executes exactly once per workflow ID. Calling `run` again with the same ID attaches to the existing execution.
- Other handlers (marked `@Shared`) can be called concurrently while `run` is in progress. Use them to send signals or read state.

---

## State Management

Never use global variables for state -- it is not durable across restarts. Use `StateKey` with `ctx.get`/`ctx.set` instead (available on `ObjectContext` and `WorkflowContext`):

```java
private static final StateKey<Long> COUNT = StateKey.of("count", Long.class);

long count = ctx.get(COUNT).orElse(0L);
ctx.set(COUNT, count + 1);
ctx.clear(COUNT);
ctx.clearAll();
Collection<String> keys = ctx.stateKeys();
```

For generic types, use `TypeRef`:

```java
import dev.restate.sdk.common.TypeRef;

private static final StateKey<List<String>> ITEMS =
    StateKey.of("items", new TypeRef<List<String>>() {});
```

---

## Service Communication

### Request-Response Calls

Code generation creates typed client classes from annotated service definitions:

```java
String response = MyServiceClient.fromContext(ctx)
    .myHandler("Hi")
    .await();

String response2 = MyObjectClient.fromContext(ctx, "key")
    .myHandler("Hi")
    .await();

String response3 = MyWorkflowClient.fromContext(ctx, "wf-id")
    .run("Hi")
    .await();
```

### One-Way Calls (Fire-and-Forget)

```java
MyServiceClient.fromContext(ctx)
    .send()
    .myHandler("Hi");

MyObjectClient.fromContext(ctx, "key")
    .send()
    .myHandler("Hi");
```

### Delayed Calls

```java
MyServiceClient.fromContext(ctx)
    .send()
    .myHandler("Hi", Duration.ofDays(5));
```

### Generic Calls (String-Based Service/Method Names)

Use when the target service type is not available at compile time:

```java
String response = ctx.call(Request.of(
    Target.service("MyService", "myHandler"),
    Serde.STEF_JSON, Serde.STEF_JSON, "Hi"
)).await();

// Generic send variant:
ctx.send(Request.of(
    Target.service("MyService", "myHandler"),
    Serde.STEF_JSON, Serde.STEF_JSON, "Hi"
));
```

---

## Side Effects / ctx.run

Never call external APIs, databases, or non-deterministic functions directly in a handler. Wrap them in `ctx.run`:

```java
String result = ctx.run("my-side-effect", String.class, () -> {
    return callExternalAPI();
});
```

- The first argument is a label used for observability and debugging.
- The second argument is the return type class.
- The return value must be JSON-serializable.

For void side effects:

```java
ctx.run("send-email", () -> {
    sendNotification(email);
});
```

---

## Deterministic Helpers

Never use `Math.random()`, `System.currentTimeMillis()`, or `new Date()` directly -- they break deterministic replay. Use ctx helpers instead:

```java
float value = ctx.random().nextFloat();
UUID uuid = ctx.random().nextUUID();
```

---

## Durable Timers

Never use `Thread.sleep`. Use `ctx.sleep` for durable delays that survive crashes and restarts:

```java
ctx.sleep(Duration.ofSeconds(30));
ctx.sleep(Duration.ofHours(1));
```

---

## Awakeables

Awakeables pause execution until an external system signals completion:

```java
Awakeable<String> awakeable = ctx.awakeable(String.class);
String id = awakeable.id();

// Send the awakeable ID to an external system
ctx.run(() -> requestHumanReview(name, id));

// Wait for the external system to resolve/reject
String review = awakeable.await();
```

Resolve or reject from another handler or external system:

```java
ctx.awakeableHandle(id).resolve(String.class, "Looks good!");
ctx.awakeableHandle(id).reject("Cannot be reviewed");
```

---

## Durable Promises (Workflows Only)

Durable promises allow communication between a workflow's `run` handler and its shared handlers:

```java
import dev.restate.sdk.common.DurablePromiseKey;

private static final DurablePromiseKey<String> REVIEW =
    DurablePromiseKey.of("review", String.class);

// In the run handler -- wait for a signal:
String review = ctx.promise(REVIEW).future().await();

// In a shared handler -- send the signal:
ctx.promiseHandle(REVIEW).resolve(value);
```

---

## Concurrency

Use `DurableFuture` combinators, NOT `CompletableFuture`:

### All (wait for all to complete)

```java
import dev.restate.sdk.DurableFuture;

DurableFuture<String> f1 = MyServiceClient.fromContext(ctx)
    .myHandler("req1");
DurableFuture<String> f2 = MyServiceClient.fromContext(ctx)
    .myHandler("req2");

DurableFuture.all(f1, f2).await();
String result1 = f1.await();
String result2 = f2.await();
```

### Any (first to settle)

Returns the 0-based index of the first future that settles:

```java
int index = DurableFuture.any(f1, f2).await();
String result = (index == 0) ? f1.await() : f2.await();
```

---

## Invocation Management

### Idempotency Keys

```java
var handle = MyServiceClient.fromContext(ctx)
    .send()
    .myHandler("Hi", req -> req.idempotencyKey("abc"));
```

### Attach to a Running Invocation

```java
String result = handle.attach().await();
```

### Cancel an Invocation

```java
handle.cancel();
```

---

## Serialization

### Default: Jackson JSON

All handler inputs/outputs and state values use Jackson JSON serialization by default. Define standard POJOs or Java records for structured data.

### StateKey with Generics

Use `TypeRef` for generic types:

```java
StateKey<Map<String, List<Integer>>> COMPLEX_STATE =
    StateKey.of("complex", new TypeRef<Map<String, List<Integer>>>() {});
```

### Custom Serde

Implement `Serde<T>` for custom serialization:

```java
public class MyCustomSerde implements Serde<MyType> {
    @Override
    public byte[] serialize(MyType value) { /* ... */ }
    @Override
    public MyType deserialize(byte[] bytes) { /* ... */ }
}
```

---

## Error Handling

Throw `TerminalException` to stop retries and propagate failure permanently:

```java
import dev.restate.sdk.common.TerminalException;

throw new TerminalException(500, "Something went wrong.");
```

Note: the Java SDK uses `TerminalException`, NOT `TerminalError` (which is used by other SDKs).

Any other exception type causes automatic retries with exponential backoff. For retry policy configuration, refer to the retry guide.

---

## SDK Clients (External Invocations)

Use `Client` to call Restate handlers from outside a Restate context (e.g., from a REST API, a script, or a cron job):

```java
import dev.restate.sdk.client.Client;

Client restateClient = Client.connect("http://localhost:8080");

// Request-response
String result = MyServiceClient.fromClient(restateClient)
    .myHandler("Hi")
    .await();

// One-way
MyServiceClient.fromClient(restateClient)
    .send()
    .myHandler("Hi");

// Delayed
MyServiceClient.fromClient(restateClient)
    .send()
    .myHandler("Hi", Duration.ofSeconds(30));
```

---

## Java-Specific Pitfalls

- **Use `TerminalException`**, NOT `TerminalError`. The Java SDK naming differs from other Restate SDKs.
- **`StateKey` pattern is required for typed state access.** Always declare state keys as static final constants with the type class.
- **Code generation creates typed client classes** (e.g., `MyServiceClient`) from `@Service`/`@VirtualObject`/`@Workflow` annotations. Use these for type-safe calls.
- **Use `DurableFuture.all/any`**, NOT `CompletableFuture`. Native Java futures break deterministic replay.
- **Never use `Thread.sleep`, `Math.random()`, or `System.currentTimeMillis()`** -- use `ctx.sleep`, `ctx.random()` instead.
- **Never use global mutable variables for state** -- use `ctx.get`/`ctx.set` with `StateKey` for durable state.
- **For testing:** use the bundled restate-docs MCP server to look up testing documentation.
- **For detailed API reference:** use the MCP server or JavaDocs.
