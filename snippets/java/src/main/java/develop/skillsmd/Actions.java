package develop.skillsmd;

import dev.restate.common.InvocationOptions;
import dev.restate.common.Request;
import dev.restate.common.Target;
import dev.restate.sdk.*;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.serde.TypeRef;
import dev.restate.serde.TypeTag;
import develop.MyObject;
import develop.MyService;
import develop.MyWorkflow;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class Actions {

  // <start_generic_state>
  // import dev.restate.serde.TypeRef;
  private static final StateKey<List<String>> ITEMS =
      StateKey.of("items", new TypeRef<List<String>>() {});

  // <end_generic_state>

  public void stateOperations() {
    // <start_state>
    var state = Restate.state();
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    String stringState = state.get(STRING_STATE_KEY).orElse("my-default");
    state.set(STRING_STATE_KEY, "my-new-value");
    state.clear(STRING_STATE_KEY);
    state.clearAll();
    Collection<String> keys = state.getAllKeys();
    // <end_state>
  }

  public void serviceCommunication() {
    String request = "Hi";
    String objectKey = "object-key";
    String workflowId = "wf-id";

    // <start_service_calls>
    String svcResponse =
        Restate.serviceHandle(MyService.class).call(MyService::myHandler, request).await();
    String objResponse =
        Restate.virtualObjectHandle(MyObject.class, objectKey)
            .call(MyObject::myHandler, request)
            .await();
    String wfResponse =
        Restate.workflowHandle(MyWorkflow.class, workflowId).call(MyWorkflow::run, request).await();
    // <end_service_calls>
  }

  public void genericServiceCalls() {
    String request = "Hi";

    // <start_generic_calls>
    // Define target
    Target target = Target.service("MyService", "myHandler");
    Target objectTarget = Target.virtualObject("MyObject", "object-key", "myHandler");
    Target workflowTarget = Target.workflow("MyWorkflow", "wf-id", "run");

    // Do the call
    String response =
        Restate.call(
                Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();

    // Or send the message
    Restate.send(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request));
    // <end_generic_calls>
  }

  public void oneWayMessages() {
    String request = "Hi";
    String objectKey = "Hi";
    String workflowId = "Hi";

    // <start_sending_messages>
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, request);
    Restate.virtualObjectHandle(MyObject.class, objectKey).send(MyObject::myHandler, request);
    Restate.workflowHandle(MyWorkflow.class, workflowId).send(MyWorkflow::run, request);
    // <end_sending_messages>
  }

  public void delayedMessages() {
    String request = "Hi";

    // <start_delayed_messages>
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, request, Duration.ofDays(5));
    // <end_delayed_messages>
  }

  public void durableSteps() {
    // <start_durable_steps>
    // Wrap non-deterministic code in Restate.run
    String result = Restate.run("call external API", String.class, () -> callExternalAPI());

    // Wrap with name for better tracing
    String namedResult = Restate.run("my-side-effect", String.class, () -> callExternalAPI());
    // <end_durable_steps>

    // <start_deterministic_helpers>
    float value = Restate.random().nextFloat();
    UUID uuid = Restate.random().nextUUID();
    // <end_deterministic_helpers>

  }

  public void durableTimers() {
    // <start_durable_timers>
    Restate.sleep(Duration.ofHours(30));
    // <end_durable_timers>
  }

  public void awakeables() {
    String name = "Pete";

    // <start_awakeables>
    // Create awakeable
    Awakeable<String> awakeable = Restate.awakeable(String.class);
    String awakeableId = awakeable.id();

    // Send ID to external system
    Restate.run("request-human-review", () -> requestHumanReview(name, awakeableId));

    // Wait for result
    String review = awakeable.await();
    // <end_awakeables>

    // <start_awakeables_resolution>
    Restate.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");
    Restate.awakeableHandle(awakeableId).reject("Cannot be reviewed");
    // <end_awakeables_resolution>
  }

  public void workflowPromises() {
    // <start_workflow_promises>
    DurablePromiseKey<String> REVIEW_PROMISE = DurablePromiseKey.of("review", String.class);
    // Wait for promise
    String review = Restate.promise(REVIEW_PROMISE).future().await();

    // Resolve promise from another handler
    Restate.promiseHandle(REVIEW_PROMISE).resolve(review);
    // <end_workflow_promises>
  }

  public void concurrency() {
    // <start_combine_all>
    // Wait for all to complete
    DurableFuture<String> call1 =
        Restate.serviceHandle(MyService.class).call(MyService::myHandler, "request1");
    DurableFuture<String> call2 =
        Restate.serviceHandle(MyService.class).call(MyService::myHandler, "request2");

    DurableFuture.all(call1, call2).await();
    // <end_combine_all>

    // <start_combine_any>
    String res = Select.<String>select().or(call1).or(call2).await();
    // <end_combine_any>
  }

  public void invocationManagement() {
    var request = "";

    // <start_idempotency>
    var handle =
        Restate.serviceHandle(MyService.class)
            .send(MyService::myHandler, request, InvocationOptions.idempotencyKey("abc123"));
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
