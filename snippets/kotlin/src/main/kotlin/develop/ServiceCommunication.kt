package develop

import dev.restate.common.Request
import dev.restate.common.Target
import dev.restate.sdk.kotlin.*
import dev.restate.serde.kotlinx.*
import kotlin.time.Duration.Companion.days

class ServiceCommunication {
  suspend fun requestResponseService() {
    val request = ""
    val objectKey = ""
    val workflowId = ""

    // <start_request_response>
    // --- Simple client: awaits inline and returns the result directly ---
    // To call a Service:
    val svcResponse = service<MyService>().myHandler(request)
    // To call a Virtual Object:
    val objResponse = virtualObject<MyObject>(objectKey).myHandler(request)
    // To call a Workflow:
    val wfResponse = workflow<MyWorkflow>(workflowId).run(request)

    // --- Handle-based client: returns a DurableFuture to await explicitly ---
    // Use it for invocation options (e.g. an idempotency key), timeouts, or concurrency.
    val svcResult = toService<MyService>().request { myHandler(request) }.call().await()
    val objResult =
        toVirtualObject<MyObject>(objectKey).request { myHandler(request) }.call().await()
    val wfResult = toWorkflow<MyWorkflow>(workflowId).request { run(request) }.call().await()
    // <end_request_response>
  }

  suspend fun oneWay() {
    val request = ""

    // <start_one_way>
    toService<MyService>().request { myHandler(request) }.send()
    // <end_one_way>
  }

  suspend fun idempotencyKey() {
    val request = ""

    // <start_idempotency_key>
    // For a regular call
    toService<MyService>()
        .request { myHandler(request) }
        .options { idempotencyKey = "abc123" }
        .call()
    // For a one way call
    toService<MyService>()
        .request { myHandler(request) }
        .options { idempotencyKey = "abc123" }
        .send()
    // <end_idempotency_key>
  }

  suspend fun attach() {
    val request = ""

    // <start_attach>
    val handle =
        toService<MyService>()
            .request { myHandler(request) }
            .options { idempotencyKey = "abc123" }
            .send()
    val response = handle.attach().await()
    // <end_attach>
  }

  suspend fun cancel() {
    val request = ""

    // <start_cancel>
    val handle = toService<MyService>().request { myHandler(request) }.send()
    handle.cancel()
    // <end_cancel>
  }

  suspend fun scope() {
    val request = ""
    val objectKey = ""
    val workflowId = ""

    // <start_scope>
    // Route a call into a named scope
    val svcResponse = scope("tenant-123").service<MyService>().myHandler(request)

    // Add a limit key for hierarchical concurrency limits within the scope
    val wfResponse =
        scope("tenant-123")
            .toWorkflow<MyWorkflow>(workflowId)
            .request { run(request) }
            .options { limitKey = "premium/user42" }
            .call()
            .await()

    // Scoped Virtual Object calls need
    // RESTATE_EXPERIMENTAL_ENABLE_SCOPED_VIRTUAL_OBJECTS=true on the server
    val objResponse = scope("tenant-123").virtualObject<MyObject>(objectKey).myHandler(request)
    // <end_scope>

    // <start_scope_request>
    // The scope and limit key the invocation was submitted with
    val invocationScope = request().scope
    val invocationLimitKey = request().limitKey
    // <end_scope_request>
  }

  suspend fun generic() {
    val request = ""

    // <start_request_response_generic>
    val target = Target.service("MyService", "myHandler")
    val response =
        prepareRequest(Request.of(target, typeTag<String>(), typeTag<String>(), request))
            .call()
            .await()
    // <end_request_response_generic>
  }

  suspend fun genericSend() {
    val request = ""

    // <start_one_way_generic>
    val target = Target.service("MyService", "myHandler")
    prepareRequest(Request.of(target, typeTag<String>(), typeTag<String>(), request)).send()
    // <end_one_way_generic>
  }

  suspend fun genericDelayed() {
    val request = ""

    // <start_delayed_generic>
    val target = Target.service("MyService", "myHandler")
    prepareRequest(Request.of(target, typeTag<String>(), typeTag<String>(), request))
        .send(delay = 5.days)
    // <end_delayed_generic>

  }

  suspend fun delayedCall() {
    val request = ""

    // <start_delayed>
    toService<MyService>().request { myHandler(request) }.send(5.days)
    // <end_delayed>
  }
}
