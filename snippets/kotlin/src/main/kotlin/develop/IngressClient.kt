package develop

import dev.restate.client.Client
import dev.restate.common.Target
import kotlin.time.Duration.Companion.days
import dev.restate.client.kotlin.*
import dev.restate.serde.kotlinx.*

class IngressClient {

  suspend fun myKotlinHandler() {
    // <start_rpc>
    val restateClient = Client.connect("http://localhost:8080")

    // To call a service
    val svcResponse = MyServiceClient.fromClient(restateClient).myHandler("Hi")

    // To call a virtual object
    val objResponse = MyObjectClient.fromClient(restateClient, "Mary").myHandler("Hi")

    // To submit a workflow
    val wfResponse =
        MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi").attach().response()
    // To interact with a workflow
    val status =
        MyWorkflowClient.fromClient(restateClient, "Mary").interactWithWorkflow("my signal")
    // <end_rpc>
  }

  suspend fun myOneWayCallHandler() {
    // <start_one_way_call>
    val restateClient = Client.connect("http://localhost:8080")

    // To message a service
    MyServiceClient.fromClient(restateClient).send().myHandler("Hi")

    // To message a virtual object
    MyObjectClient.fromClient(restateClient, "Mary").send().myHandler("Hi")

    // To submit a workflow without waiting for the result
    MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi")
    // <end_one_way_call>
  }

  suspend fun myDelayedOneWayCallHandler() {
    // <start_delayed_call>
    val restateClient = Client.connect("http://localhost:8080")

    // To message a service with a delay
    MyServiceClient.fromClient(restateClient).send().myHandler("Hi", 5.days)

    // To message a virtual object with a delay
    MyObjectClient.fromClient(restateClient, "Mary").send().myHandler("Hi", 5.days)
    // <end_delayed_call>
  }

  suspend fun idempotentInvoke() {
    // <start_service_idempotent>
    val restateClient = Client.connect("http://localhost:8080")
    MyServiceClient.fromClient(restateClient).send().myHandler("Hi") { idempotencyKey = "abc" }
    // <end_service_idempotent>
  }

  suspend fun attach() {
    // <start_service_attach>
    val restateClient = Client.connect("http://localhost:8080")

    // The call to which we want to attach later
    val handle =
        MyServiceClient.fromClient(restateClient).send().myHandler("Hi") {
          idempotencyKey = "my-idempotency-key"
        }

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the call
    // - Attach
    val result1 = handle.attach().response()
    // - Peek
    val output = handle.getOutput().response()
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
    val wfHandle = MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi")

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the workflow submission
    // - Attach
    val result = wfHandle.attach().response()
    // - Peek
    val output = wfHandle.getOutput().response()
    if (output.isReady()) {
      val result2 = output.getValue()
    }

    // ---------------------------------
    // OPTION 2: With the workflow ID
    val wfHandle2 = restateClient.workflowHandle("MyWorkflow", "wf-id", typeTag<String>())
    // use it to attach or peek (see above)
    // <end_workflow_attach>
  }
}
