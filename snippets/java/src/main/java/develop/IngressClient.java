package develop;

import dev.restate.client.Client;
import dev.restate.common.Output;
import dev.restate.common.Target;
import java.time.Duration;

public class IngressClient {

  public void myJavaHandler() {
    // <start_rpc>
    Client restateClient = Client.connect("http://localhost:8080");

    // To call a service
    String svcResponse = MyServiceClient.fromClient(restateClient).myHandler("Hi");

    // To call a virtual object
    String objResponse = MyObjectClient.fromClient(restateClient, "Mary").myHandler("Hi");

    // To submit a workflow
    String wfResponse =
        MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi").attach().response();
    // To interact with a workflow
    String status =
        MyWorkflowClient.fromClient(restateClient, "Mary").interactWithWorkflow("my signal");
    // <end_rpc>
  }

  public void myOneWayCallHandler() {

    // <start_one_way_call>
    Client restateClient = Client.connect("http://localhost:8080");

    // To message a service
    MyServiceClient.fromClient(restateClient).send().myHandler("Hi");

    // To message a virtual object
    MyObjectClient.fromClient(restateClient, "Mary").send().myHandler("Hi");

    // To submit a workflow without waiting for the result
    MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi");
    // <end_one_way_call>
  }

  public void myDelayedOneWayCallHandler() {
    // <start_delayed_call>
    Client restateClient = Client.connect("http://localhost:8080");

    // To message a service with a delay
    MyServiceClient.fromClient(restateClient).send().myHandler("Hi", Duration.ofDays(5));

    // To message a virtual object with a delay
    MyObjectClient.fromClient(restateClient, "Mary").send().myHandler("Hi", Duration.ofDays(5));
    // <end_delayed_call>

  }

  public void idempotentInvoke() {
    // <start_service_idempotent>
    Client restateClient = Client.connect("http://localhost:8080");
    MyObjectClient.fromClient(restateClient, "Mary")
        .send()
        .myHandler("Hi", opt -> opt.idempotencyKey("abc"));
    // <end_service_idempotent>
  }

  public void attach() {

    // <start_service_attach>
    Client restateClient = Client.connect("http://localhost:8080");

    // The call to which we want to attach later
    var handle =
        MyServiceClient.fromClient(restateClient)
            .send()
            .myHandler("Hi", opt -> opt.idempotencyKey("my-idempotency-key"));

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the call
    // - Attach
    String result1 = handle.attach().response();
    // - Peek
    Output<String> output = handle.getOutput().response();
    if (output.isReady()) {
      String result2 = output.getValue();
    }

    // ---------------------------------
    // OPTION 2: With the Invocation ID
    // Retrieve the invocation ID from the handle and send it to another process
    String invocationId = handle.invocationId();

    // Attach/peek later from the other process
    var handle2 = restateClient.invocationHandle(invocationId, String.class);
    // use it to attach or peek (see above)

    // ---------------------------------
    // OPTION 3: With the idempotency key
    var myService = Target.service("MyService", "myHandler");
    var handle3 =
        restateClient.idempotentInvocationHandle(myService, "my-idempotency-key", String.class);
    // use it to attach or peek (see above)
    // <end_service_attach>

  }

  public void workflowAttach() {
    // <start_workflow_attach>
    Client restateClient = Client.connect("http://localhost:8080");

    // The workflow to which we want to attach later
    var wfHandle = MyWorkflowClient.fromClient(restateClient, "Mary").submit("Hi");

    // ... do something else ...

    // ---------------------------------
    // OPTION 1: With the handle returned by the workflow submission
    // - Attach
    String result = wfHandle.attach().response();
    // - Peek
    Output<String> output = wfHandle.getOutput().response();
    if (output.isReady()) {
      String result2 = output.getValue();
    }

    // ---------------------------------
    // OPTION 2: With the workflow ID
    var wfHandle2 = restateClient.workflowHandle("MyWorkflow", "wf-id", String.class);
    // use it to attach or peek (see above)
    // <end_workflow_attach>
  }
}
