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
    // To call a Service:
    val svcResponse = toService<MyService>().request { myHandler(request) }.call().await()

    // To call a Virtual Object:
    val objResponse =
        toVirtualObject<MyObject>(objectKey).request { myHandler(request) }.call().await()

    // To call a Workflow:
    // `run` handler — can only be called once per workflow ID
    val wfResponse = toWorkflow<MyWorkflow>(workflowId).request { run(request) }.call().await()
    // Other handlers can be called anytime within workflow retention
    toWorkflow<MyWorkflow>(workflowId).request { interactWithWorkflow(request) }.call().await()
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
