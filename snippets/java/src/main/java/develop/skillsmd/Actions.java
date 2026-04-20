package develop.skillsmd;

import dev.restate.common.Request;
import dev.restate.common.Target;
import dev.restate.sdk.*;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.serde.TypeTag;
import develop.MyObjectClient;
import develop.MyServiceClient;
import develop.MyWorkflowClient;
import java.time.Duration;
import java.util.Collection;
import dev.restate.sdk.common.TypeRef;

public class Actions {

  public void stateOperations(ObjectContext ctx) {
    // <start_state>
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    String stringState = ctx.get(STRING_STATE_KEY).orElse("my-default");
    ctx.set(STRING_STATE_KEY, "my-new-value");
    ctx.clear(STRING_STATE_KEY);
    ctx.clearAll();
    Collection<String> keys = ctx.stateKeys();
    // <end_state>

    // <start_generic_state>
    // import dev.restate.sdk.common.TypeRef;
    private static final StateKey<List<String>> ITEMS = StateKey.of("items", new TypeRef<List<String>>() {});
    // <end_generic_state>
  }

  public void serviceCommunication(Context ctx) {
    String request = "Hi";
    String objectKey = "object-key";
    String workflowId = "wf-id";

    // <start_service_calls>
    String svcResponse = MyServiceClient.fromContext(ctx).myHandler(request).await();
    String objResponse = MyObjectClient.fromContext(ctx, objectKey).myHandler(request).await();
    String wfResponse = MyWorkflowClient.fromContext(ctx, workflowId).run(request).await();
    // <end_service_calls>
  }

  public void genericServiceCalls(Context ctx) {
    String request = "Hi";

    // <start_generic_calls>
    // Define target
    Target target = Target.service("MyService", "myHandler");
    Target objectTarget = Target.virtualObject("MyObject", "object-key", "myHandler");
    Target workflowTarget = Target.workflow("MyWorkflow", "wf-id", "run");

    // Do the call
    String response =
        ctx.call(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();

    // Or send the message
    ctx.send(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request));
    // <end_generic_calls>
  }

  public void oneWayMessages(Context ctx) {
    String request = "Hi";
    String objectKey = "Hi";
    String workflowId = "Hi";

    // <start_sending_messages>
    MyServiceClient.fromContext(ctx).send().myHandler(request);
    MyObjectClient.fromContext(ctx, objectKey).send().myHandler(request);
    MyWorkflowClient.fromContext(ctx, workflowId).send().run(request);
    // <end_sending_messages>
  }

  public void delayedMessages(Context ctx) {
    String request = "Hi";

    // <start_delayed_messages>
    MyServiceClient.fromContext(ctx).send().myHandler(request, Duration.ofDays(5));
    // <end_delayed_messages>
  }

  public void durableSteps(Context ctx) {
    // <start_durable_steps>
    // Wrap non-deterministic code in ctx.run
    String result = ctx.run("call external API", String.class, () -> callExternalAPI());

    // Wrap with name for better tracing
    String namedResult = ctx.run("my-side-effect", String.class, () -> callExternalAPI());
    // <end_durable_steps>

    // <start_deterministic_helpers>
    float value = ctx.random().nextFloat();
    UUID uuid = ctx.random().nextUUID();
    // <end_deterministic_helpers>

  }

  public void durableTimers(Context ctx) {
    // <start_durable_timers>
    ctx.sleep(Duration.ofHours(30));
    // <end_durable_timers>
  }

  public void awakeables(ObjectContext ctx) {
    String name = "Pete";

    // <start_awakeables>
    // Create awakeable
    Awakeable<String> awakeable = ctx.awakeable(String.class);
    String awakeableId = awakeable.id();

    // Send ID to external system
    ctx.run(() -> requestHumanReview(name, awakeableId));

    // Wait for result
    String review = awakeable.await();
    // <end_awakeables>

    // <start_awakeables_resolution>
    ctx.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");
    ctx.awakeableHandle(awakeableId).reject("Cannot be reviewed");
    // <end_awakeables_resolution>
  }

  public void workflowPromises(WorkflowContext ctx) {
    // <start_workflow_promises>
    DurablePromiseKey<String> REVIEW_PROMISE = DurablePromiseKey.of("review", String.class);
    // Wait for promise
    String review = ctx.promise(REVIEW_PROMISE).future().await();

    // Resolve promise from another handler
    ctx.promiseHandle(REVIEW_PROMISE).resolve(review);
    // <end_workflow_promises>
  }

  public void concurrency(Context ctx) {
    // <start_combine_all>
    // Wait for all to complete
    DurableFuture<String> call1 = MyServiceClient.fromContext(ctx).myHandler("request1");
    DurableFuture<String> call2 = MyServiceClient.fromContext(ctx).myHandler("request2");

    DurableFuture.all(call1, call2).await();
    // <end_combine_all>

    // <start_combine_any>
    boolean res = Select.<Boolean>select().or(a1).or(a2).or(a3).await();
    // <end_combine_any>
  }

  public void invocationManagement(Context ctx) {
    var request = "";

    // <start_idempotency>
    var handle =
        MyServiceClient.fromContext(ctx)
            .send()
            .myHandler(request, req -> req.idempotencyKey("abc123"));
    // <end_idempotency>

    // <start_attach>
    var response = handle.attach().await();
    // <end_attach>

    // <start_cancel>
    handle.cancel();
    // <end_cancel>
  }

  // Helper methods
  private String callExternalAPI() {
    return "external result";
  }

  private void requestHumanReview(String name, String awakeableId) {
    // External review logic
  }
}
