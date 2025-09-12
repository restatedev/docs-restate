package develop

import dev.restate.common.Request
import dev.restate.common.Target
import dev.restate.sdk.kotlin.*
import dev.restate.serde.kotlinx.*
import kotlin.time.Duration.Companion.days

class ServiceCommunication {
  suspend fun requestResponseService(ctx: Context) {
    val request = ""
    val objectKey = ""
    val workflowId = ""

    // <start_request_response>
    // To call a Service:
    val svcResponse = MyServiceClient.fromContext(ctx).myHandler(request).await()

    // To call a Virtual Object:
    val objResponse = MyObjectClient.fromContext(ctx, objectKey).myHandler(request).await()

    // To call a Workflow:
    // `run` handler — can only be called once per workflow ID
    val wfResponse = MyWorkflowClient.fromContext(ctx, workflowId).run(request).await()
    // Other handlers can be called anytime within workflow retention
    MyWorkflowClient.fromContext(ctx, workflowId).interactWithWorkflow(request).await()
    // <end_request_response>
  }

  suspend fun oneWay(ctx: Context) {
    val request = ""

    // <start_one_way>
    MyServiceClient.fromContext(ctx).send().myHandler(request)
    // <end_one_way>
  }

  suspend fun idempotencyKey(ctx: Context) {
    val request = ""

    // <start_idempotency_key>
    // For a regular call
    MyServiceClient.fromContext(ctx).myHandler(request) { idempotencyKey = "abc123" }
    // For a one way call
    MyServiceClient.fromContext(ctx).send().myHandler(request) { idempotencyKey = "abc123" }
    // <end_idempotency_key>
  }

  suspend fun attach(ctx: Context) {
    val request = ""

    // <start_attach>
    val handle =
        MyServiceClient.fromContext(ctx).send().myHandler(request) { idempotencyKey = "abc123" }
    val response = handle.attach().await()
    // <end_attach>
  }

  suspend fun cancel(ctx: Context) {
    val request = ""

    // <start_cancel>
    val handle = MyServiceClient.fromContext(ctx).send().myHandler(request)
    handle.cancel()
    // <end_cancel>
  }

  suspend fun generic(ctx: Context) {
    val request = ""

    // <start_request_response_generic>
    val target = Target.service("MyService", "myHandler")
    val response =
        ctx.call(Request.of(target, typeTag<String>(), typeTag<String>(), request)).await()
    // <end_request_response_generic>
  }

  suspend fun genericSend(ctx: Context) {
    val request = ""

    // <start_one_way_generic>
    val target = Target.service("MyService", "myHandler")
    ctx.send(Request.of(target, typeTag<String>(), typeTag<String>(), request))
    // <end_one_way_generic>
  }

  suspend fun genericDelayed(ctx: Context) {
    val request = ""

    // <start_delayed_generic>
    val target = Target.service("MyService", "myHandler")
    Request.of(target, typeTag<String>(), typeTag<String>(), request).send(ctx, 5.days)
    // <end_delayed_generic>

  }

  suspend fun delayedCall(ctx: Context) {
    val request = ""

    // <start_delayed>
    MyServiceClient.fromContext(ctx).send().myHandler(request, 5.days)
    // <end_delayed>
  }
}
