package develop;

import dev.restate.common.InvocationOptions;
import dev.restate.common.Request;
import dev.restate.common.Target;
import dev.restate.sdk.Restate;
import dev.restate.serde.TypeTag;
import java.time.Duration;

public class ServiceCommunication {

  private void requestResponseService() {
    String request = "";
    String workflowId = "";
    String objectKey = "";

    // <start_request_response>
    // --- Simple client: awaits inline and returns the result directly ---
    // To call a Service:
    String svcResponse = Restate.service(MyService.class).myHandler(request);
    // To call a Virtual Object:
    String objResponse = Restate.virtualObject(MyObject.class, objectKey).myHandler(request);
    // To call a Workflow:
    String wfResponse = Restate.workflow(MyWorkflow.class, workflowId).run(request);

    // --- Handle-based client: returns a DurableFuture to await explicitly ---
    // Use it for invocation options (e.g. an idempotency key), timeouts, or concurrency.
    String svcResult =
        Restate.serviceHandle(MyService.class).call(MyService::myHandler, request).await();
    String objResult =
        Restate.virtualObjectHandle(MyObject.class, objectKey)
            .call(MyObject::myHandler, request)
            .await();
    String wfResult =
        Restate.workflowHandle(MyWorkflow.class, workflowId).call(MyWorkflow::run, request).await();
    // <end_request_response>
  }

  private void genericCall() {
    String request = "";

    // <start_request_response_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    String response =
        Restate.call(
                Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();
    // <end_request_response_generic>
  }

  private void genericSend() {
    String request = "";

    // <start_one_way_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    Restate.send(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request));
    // <end_one_way_generic>
  }

  private void genericDelayedSend() {
    String request = "";

    // <start_delayed_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    Restate.send(
        Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request),
        Duration.ofDays(5));
    // <end_delayed_generic>
  }

  private void oneWay() {
    String request = "";

    // <start_one_way>
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, request);
    // <end_one_way>
  }

  private void idempotencyKey() {
    String request = "";

    // <start_idempotency_key>
    // For a request-response call
    Restate.serviceHandle(MyService.class)
        .call(MyService::myHandler, request, InvocationOptions.idempotencyKey("abc123"));
    // For a message
    Restate.serviceHandle(MyService.class)
        .send(MyService::myHandler, request, InvocationOptions.idempotencyKey("abc123"));
    // <end_idempotency_key>
  }

  private void attach() {
    String request = "";

    // <start_attach>
    var handle =
        Restate.serviceHandle(MyService.class)
            .send(MyService::myHandler, request, InvocationOptions.idempotencyKey("abc123"));
    var response = handle.attach().await();
    // <end_attach>
  }

  private void cancel() {
    String request = "";

    // <start_cancel>
    var handle = Restate.serviceHandle(MyService.class).send(MyService::myHandler, request);
    handle.cancel();
    // <end_cancel>
  }

  private void delayedCall() {
    String request = "";

    // <start_delayed>
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, request, Duration.ofDays(5));
    // <end_delayed>
  }

  private void orderingGuarantees() {
    String objectKey = "";
    // <start_ordering>
    Restate.virtualObjectHandle(MyObject.class, objectKey).send(MyObject::myHandler, "I'm call A");
    Restate.virtualObjectHandle(MyObject.class, objectKey).send(MyObject::myHandler, "I'm call B");
    // <end_ordering>
  }
}
