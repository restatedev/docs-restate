package develop;

import dev.restate.common.Request;
import dev.restate.common.Target;
import dev.restate.sdk.Context;
import dev.restate.serde.TypeTag;
import java.time.Duration;

public class ServiceCommunication {

  private void requestResponseService(Context ctx) {
    String request = "";
    String workflowId = "";
    String objectKey = "";

    // <start_request_response>
    // To call a Service:
    String svcResponse = MyServiceClient.fromContext(ctx).myHandler(request).await();

    // To call a Virtual Object:
    String objResponse =
        MyVirtualObjectClient.fromContext(ctx, objectKey).myHandler(request).await();

    // To call a Workflow:
    // `run` handler — can only be called once per workflow ID
    String wfResponse = MyWorkflowClient.fromContext(ctx, workflowId).run(request).await();
    // Other handlers can be called anytime within workflow retention
    MyWorkflowClient.fromContext(ctx, workflowId).interactWithWorkflow(request).await();
    // <end_request_response>
  }

  private void genericCall(Context ctx) {
    String request = "";

    // <start_request_response_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    String response =
        ctx.call(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();
    // <end_request_response_generic>
  }

  private void genericSend(Context ctx) {
    String request = "";

    // <start_one_way_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    ctx.send(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request));
    // <end_one_way_generic>
  }

  private void genericDelayedSend(Context ctx) {
    String request = "";

    // <start_delayed_generic>
    Target target = Target.service("MyService", "myHandler"); // or virtualObject or workflow
    ctx.send(
        Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request),
        Duration.ofDays(5));
    // <end_delayed_generic>
  }

  private void oneWay(Context ctx) {
    String request = "";

    // <start_one_way>
    MyServiceClient.fromContext(ctx).send().myHandler(request);
    // <end_one_way>
  }

  private void idempotencyKey(Context ctx) {
    String request = "";

    // <start_idempotency_key>
    // For a request-response call
    MyServiceClient.fromContext(ctx).myHandler(request, req -> req.idempotencyKey("abc123"));
    // For a message
    MyServiceClient.fromContext(ctx).send().myHandler(request, req -> req.idempotencyKey("abc123"));
    // <end_idempotency_key>
  }

  private void attach(Context ctx) {
    String request = "";

    // <start_attach>
    var handle =
        MyServiceClient.fromContext(ctx)
            .send()
            .myHandler(request, req -> req.idempotencyKey("abc123"));
    var response = handle.attach().await();
    // <end_attach>
  }

  private void cancel(Context ctx) {
    String request = "";

    // <start_cancel>
    var handle = MyServiceClient.fromContext(ctx).send().myHandler(request);
    handle.cancel();
    // <end_cancel>
  }

  private void delayedCall(Context ctx) {
    String request = "";

    // <start_delayed>
    MyServiceClient.fromContext(ctx).send().myHandler(request, Duration.ofDays(5));
    // <end_delayed>
  }

  private void orderingGuarantees(Context ctx) {
    String objectKey = "";
    // <start_ordering>
    MyVirtualObjectClient.fromContext(ctx, objectKey).send().myHandler("I'm call A");
    MyVirtualObjectClient.fromContext(ctx, objectKey).send().myHandler("I'm call B");
    // <end_ordering>
  }
}
