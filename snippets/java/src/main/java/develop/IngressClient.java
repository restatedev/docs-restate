package develop;

import dev.restate.client.Client;
import dev.restate.common.InvocationOptions;
import dev.restate.common.Output;
import dev.restate.common.Target;
import java.time.Duration;

public class IngressClient {

  public void myJavaHandler() {
    // <start_rpc>
    Client restateClient = Client.connect("http://localhost:8080");

    // To call a service
    String svcResponse = restateClient.service(MyService.class).myHandler("Hi");

    // To call a virtual object
    String objResponse = restateClient.virtualObject(MyObject.class, "Mary").myHandler("Hi");

    // To submit a workflow
    String wfResponse =
        restateClient
            .workflowHandle(MyWorkflow.class, "Mary")
            .send(MyWorkflow::run, "Hi")
            .attach()
            .response();
    // To interact with a workflow
    String status =
        restateClient.workflow(MyWorkflow.class, "Mary").interactWithWorkflow("my signal");
    // <end_rpc>
  }

  public void myOneWayCallHandler() {

    // <start_one_way_call>
    Client restateClient = Client.connect("http://localhost:8080");

    // To message a service
    restateClient.serviceHandle(MyService.class).send(MyService::myHandler, "Hi");

    // To message a virtual object
    restateClient.virtualObjectHandle(MyObject.class, "Mary").send(MyObject::myHandler, "Hi");

    // To submit a workflow without waiting for the result
    restateClient.workflowHandle(MyWorkflow.class, "Mary").send(MyWorkflow::run, "Hi");
    // <end_one_way_call>
  }

  public void myDelayedOneWayCallHandler() {
    // <start_delayed_call>
    Client restateClient = Client.connect("http://localhost:8080");

    // To message a service with a delay
    restateClient
        .serviceHandle(MyService.class)
        .send(MyService::myHandler, "Hi", Duration.ofDays(5));

    // To message a virtual object with a delay
    restateClient
        .virtualObjectHandle(MyObject.class, "Mary")
        .send(MyObject::myHandler, "Hi", Duration.ofDays(5));

    // To submit a workflow with a delay
    restateClient
        .workflowHandle(MyWorkflow.class, "Mary")
        .send(MyWorkflow::run, "Hi", Duration.ofDays(5));
    // <end_delayed_call>

  }

  public void idempotentInvoke() {
    // <start_service_idempotent>
    Client restateClient = Client.connect("http://localhost:8080");
    restateClient
        .virtualObjectHandle(MyObject.class, "Mary")
        .send(MyObject::myHandler, "Hi", InvocationOptions.idempotencyKey("abc"));
    // <end_service_idempotent>
  }

  public void attach() {

    // <start_service_attach>
    Client restateClient = Client.connect("http://localhost:8080");

    // The call to which we want to attach later
    var handle =
        restateClient
            .serviceHandle(MyService.class)
            .send(
                MyService::myHandler, "Hi", InvocationOptions.idempotencyKey("my-idempotency-key"));

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
    var wfHandle =
        restateClient.workflowHandle(MyWorkflow.class, "Mary").send(MyWorkflow::run, "Hi");

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

  public void scopedClient() {
    // <start_scope>
    Client restateClient = Client.connect("http://localhost:8080");

    // Route a call into a named scope
    String svcResponse = restateClient.scope("tenant-123").service(MyService.class).myHandler("Hi");

    // Add a limit key for a hierarchical concurrency limit within the scope
    String objResponse =
        restateClient
            .scope("tenant-123")
            .virtualObjectHandle(MyObject.class, "Mary")
            .call(MyObject::myHandler, "Hi", InvocationOptions.limitKey("premium/user42"))
            .response();

    // Fire-and-forget sends can be scoped too
    restateClient
        .scope("tenant-123")
        .serviceHandle(MyService.class)
        .send(MyService::myHandler, "Hi");
    // <end_scope>
  }
}
