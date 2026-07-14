package develop

import dev.restate.client.Client
import dev.restate.client.kotlin.*
import dev.restate.common.Target
import dev.restate.serde.kotlinx.*
import kotlin.time.Duration.Companion.days

class IngressClient {

  suspend fun myKotlinHandler() {
    // <start_rpc>
    val restateClient = Client.connect("http://localhost:8080")

    // To call a service
    val svcResponse = restateClient.service<MyService>().myHandler("Hi")

    // To call a virtual object
    val objResponse = restateClient.virtualObject<MyObject>("Mary").myHandler("Hi")

    // To submit a workflow
    val wfResponse =
        restateClient
            .toWorkflow<MyWorkflow>("Mary")
            .request { run("Hi") }
            .send()
            .attachSuspend()
            .response()
    // To interact with a workflow
    val status = restateClient.workflow<MyWorkflow>("Mary").interactWithWorkflow("my signal")
    // <end_rpc>
  }

  suspend fun myOneWayCallHandler() {
    // <start_one_way_call>
    val restateClient = Client.connect("http://localhost:8080")

    // To message a service
    restateClient.toService<MyService>().request { myHandler("Hi") }.send()

    // To message a virtual object
    restateClient.toVirtualObject<MyObject>("Mary").request { myHandler("Hi") }.send()

    // To submit a workflow without waiting for the result
    restateClient.toWorkflow<MyWorkflow>("Mary").request { run("Hi") }.send()
    // <end_one_way_call>
  }

  suspend fun myDelayedOneWayCallHandler() {
    // <start_delayed_call>
    val restateClient = Client.connect("http://localhost:8080")

    // To message a service with a delay
    restateClient.toService<MyService>().request { myHandler("Hi") }.send(5.days)

    // To message a virtual object with a delay
    restateClient.toVirtualObject<MyObject>("Mary").request { myHandler("Hi") }.send(5.days)
    // <end_delayed_call>
  }

  suspend fun idempotentInvoke() {
    // <start_service_idempotent>
    val restateClient = Client.connect("http://localhost:8080")
    restateClient
        .toService<MyService>()
        .request { myHandler("Hi") }
        .options { idempotencyKey = "abc" }
        .send()
    // <end_service_idempotent>
  }

  suspend fun attach() {
    // <start_service_attach>
    val restateClient = Client.connect("http://localhost:8080")

    // The call to which we want to attach later
    val handle =
        restateClient
            .toService<MyService>()
            .request { myHandler("Hi") }
            .options { idempotencyKey = "my-idempotency-key" }
            .send()

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the call
    // - Attach
    val result1 = handle.attachSuspend().response()
    // - Peek
    val output = handle.getOutputSuspend().response()
    if (output.isReady()) {
      val result2 = output.getValue()
    }

    // ---------------------------------
    // OPTION 2: With the Invocation ID
    // Retrieve the invocation ID from the handle and send it to another process
    val invocationId = handle.invocationId()

    // Attach/peek later from the other process
    val handle2 = restateClient.invocationHandle(invocationId, typeTag<String>())
    // use it to attach or peek (see above)

    // ---------------------------------
    // OPTION 3: With the idempotency key
    val target = Target.service("MyService", "myHandler")
    val handle3 =
        restateClient.idempotentInvocationHandle(target, "my-idempotency-key", typeTag<String>())
    // use it to attach or peek (see above)
    // <end_service_attach>
  }

  suspend fun workflowAttach() {
    // <start_workflow_attach>
    val restateClient = Client.connect("http://localhost:8080")

    // The workflow to which we want to attach later
    val wfHandle = restateClient.toWorkflow<MyWorkflow>("Mary").request { run("Hi") }.send()

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the workflow submission
    // - Attach
    val result = wfHandle.attachSuspend().response()
    // - Peek
    val output = wfHandle.getOutputSuspend().response()
    if (output.isReady()) {
      val result2 = output.getValue()
    }

    // ---------------------------------
    // OPTION 2: With the workflow ID
    val wfHandle2 = restateClient.workflowHandle("MyWorkflow", "wf-id", typeTag<String>())
    // use it to attach or peek (see above)
    // <end_workflow_attach>
  }

  suspend fun scopedClient() {
    // <start_scope>
    val restateClient = Client.connect("http://localhost:8080")

    // Route a call into a named scope
    val svcResponse = restateClient.scope("tenant-123").service<MyService>().myHandler("Hi")

    // Add a limit key for a hierarchical concurrency limit within the scope
    val objResponse =
        restateClient
            .scope("tenant-123")
            .toVirtualObject<MyObject>("Mary")
            .request { myHandler("Hi") }
            .options { limitKey = "premium/user42" }
            .call()
            .response()

    // Fire-and-forget sends can be scoped too
    restateClient.scope("tenant-123").toService<MyService>().request { myHandler("Hi") }.send()
    // <end_scope>
  }
}
