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

Or Docker:
```bash
docker run -it docker.restate.dev/restatedev/restate-cli:latest invocations ls
```

### Install SDK

**Gradle (build.gradle.kts):**
```kt
// Annotation processor
annotationProcessor("dev.restate:sdk-api-gen:2.4.1")

// For deploying as HTTP service
implementation("dev.restate:sdk-java-http:2.4.1")
// Or for deploying using AWS Lambda
implementation("dev.restate:sdk-java-lambda:2.4.1")
```

**Maven**: 
```xml Java/Maven
<properties>
    <restate.version>2.4.1</restate.version>
</properties>
<dependencies>
    <!-- For deploying as HTTP service -->
    <dependency>
        <groupId>dev.restate</groupId>
        <artifactId>sdk-java-http</artifactId>
        <version>${restate.version}</version>
    </dependency>
    <!-- For deploying using AWS Lambda -->
    <dependency>
        <groupId>dev.restate</groupId>
        <artifactId>sdk-java-lambda</artifactId>
        <version>${restate.version}</version>
    </dependency>
</dependencies>
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <!-- Setup annotation processor -->
                    <path>
                        <groupId>dev.restate</groupId>
                        <artifactId>sdk-api-gen</artifactId>
                        <version>${restate.version}</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Minimal Scaffold

```java {"CODE_LOAD::java/src/main/java/develop/MyService.java#here"}
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

See minimal scaffold above.

### Virtual Object (Stateful, Keyed)

```java {"CODE_LOAD::java/src/main/java/develop/MyObject.java#here"}
```

- **Exclusive handlers** (`@Handler`): only one executes at a time per key. Use for writes.  Receive `ObjectContext`.
- **Shared handlers** (`@Shared`): run concurrently per key. Use for reads.  Receive `SharedObjectContext`.

### Workflow

```java {"CODE_LOAD::java/src/main/java/develop/MyWorkflow.java#here"}
```

- `run` executes exactly once per workflow ID. Calling `run` again with the same ID attaches to the existing execution.
- Other handlers (marked `@Shared`) can be called concurrently while `run` is in progress. Use them to send signals or read state.

---

## State Management

Never use global variables for state -- it is not durable across restarts. Use `StateKey` with `ctx.get`/`ctx.set` instead (available on `ObjectContext` and `WorkflowContext`):

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#state"}
```

For generic types, use `TypeRef`:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#generic_state"}
```

---

## Service Communication

### Request-Response Calls

Code generation creates typed client classes from annotated service definitions:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#service_calls"}
```

### One-Way Calls (Fire-and-Forget)

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#sending_messages"}
```

### Delayed Calls

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#delayed_messages"}
```

### Generic Calls (String-Based Service/Method Names)

Use when the target service type is not available at compile time:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#generic_calls"}
```

---

## Side Effects / ctx.run

Never call external APIs, databases, or non-deterministic functions directly in a handler. Wrap them in `ctx.run`:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#durable_steps"}
```

- The first argument is a label used for observability and debugging.
- The second argument is the return type class.
- The third argument is the function to execute.
- The return value must be JSON-serializable.

---

## Deterministic Helpers

Never use `Math.random()`, `System.currentTimeMillis()`, or `new Date()` directly -- they break deterministic replay. Use ctx helpers instead:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#deterministic_helpers"}
```

---

## Durable Timers

Never use `Thread.sleep`. Use `ctx.sleep` for durable delays that survive crashes and restarts:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#durable_timers"}
```

---

## Awakeables

Awakeables pause execution until an external system signals completion:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#awakeables"}
```

External systems can also resolve/reject via HTTP:
`curl localhost:8080/restate/awakeables/<id>/resolve --json '"Looks good!"'`

Or from another handler:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#awakeables_resolution"}
```

---

## Durable Promises (Workflows Only)

Cross-handler signaling within a Workflow. No ID management needed.

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#workflow_promises"}
```

---

## Concurrency

Use `DurableFuture` combinators, NOT `CompletableFuture`. Native combinators are not journaled and break deterministic replay.

### All (wait for all to complete)

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#combine_all"}
```

### Select (first to complete)

Returns the value of whichever future completes first:

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#combine_any"}
```

---

## Invocation Management

### Idempotency Keys

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#idempotency"}
```

### Attach to a Running Invocation

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#attach"}
```

### Cancel an Invocation

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Actions.java#cancel"}
```

---

## Serialization

### Default: Jackson JSON

All handler inputs/outputs and state values use Jackson JSON serialization by default. Define standard POJOs or Java records for structured data.

### Custom Serde

Implement `Serde<T>` for custom serialization when Jackson defaults are not sufficient (binary payloads, non-JSON formats, or types with custom encoding). Pass the serde when declaring a `StateKey`, `DurablePromiseKey`, awakeable, or `ctx.run` call.

---

## Error Handling

Throw `TerminalException` to stop retries and propagate failure permanently:

```java {"CODE_LOAD::java/src/main/java/develop/ErrorHandling.java#here"}
```

Note: the Java SDK uses `TerminalException`, NOT `TerminalError` (which is used by other SDKs).

Any other exception type causes automatic retries with exponential backoff. For retry policy configuration, refer to the retry guide.

---

## SDK Clients (External Invocations)

Use `Client` to call Restate handlers from outside a Restate context (e.g., from a REST API, a script, or a cron job):

```java {"CODE_LOAD::java/src/main/java/develop/skillsmd/Clients.java#here"}
```

---

## Java-Specific Pitfalls

- **Code generation creates typed client classes** (e.g., `MyServiceClient`) from `@Service`/`@VirtualObject`/`@Workflow` annotations. Use these for type-safe calls.
- **Use Restate's future combinators, NOT `CompletableFuture`.** Native Java futures break deterministic replay.
- **Never use `Thread.sleep`, `Math.random()`, or `System.currentTimeMillis()`** -- use Restate context actions instead.
- **Never use global mutable variables for state** -- use Restate's K/V store for durable state.
- **For detailed API reference:** use the MCP server or JavaDocs.

## Testing

Add dependency: `dev.restate:sdk-testing` (includes Testcontainers support)

Tests run against a real Restate Server in Docker. 

```java {"CODE_LOAD::java/src/main/java/develop/MyServiceTestMethod.java"}
```

Use tests also to catch non-determinism bugs that unit tests miss: if handler code is non-deterministic, replay produces different results and the test fails.
You can do this by setting the environment variable `RESTATE_WORKER__INVOKER__INACTIVITY_TIMEOUT=0m` for the Restate Server.

---

## Further resources

- For detailed API: use the JavaDoc https://restatedev.github.io/sdk-java/javadocs/ or the bundled restate-docs MCP server
- Examples: https://github.com/restatedev/examples
- AI agent examples: https://github.com/restatedev/ai-examples