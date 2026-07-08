package develop.agentsmd;

import dev.restate.common.InvocationOptions;
import dev.restate.common.Request;
import dev.restate.common.Target;
import dev.restate.sdk.*;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.serde.TypeTag;
import develop.MyObject;
import develop.MyService;
import develop.MyWorkflow;
import java.time.Duration;
import java.util.Collection;

public class Actions {

  public void stateOperations() {
    // <start_state>
    var state = Restate.state();

    // Get state keys
    Collection<String> keys = state.getAllKeys();

    // Get state
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    String stringState = state.get(STRING_STATE_KEY).orElse("my-default");

    StateKey<Integer> INT_STATE_KEY = StateKey.of("count", Integer.class);
    int count = state.get(INT_STATE_KEY).orElse(0);

    // Set state
    state.set(STRING_STATE_KEY, "my-new-value");
    state.set(INT_STATE_KEY, count + 1);

    // Clear state
    state.clear(STRING_STATE_KEY);
    state.clearAll();
    // <end_state>
  }

  public void serviceCommunication() {
    String request = "Hi";
    String objectKey = "object-key";
    String workflowId = "wf-id";

    // <start_service_calls>
    // Call a Service
    String svcResponse =
        Restate.serviceHandle(MyService.class).call(MyService::myHandler, request).await();

    // Call a Virtual Object
    String objResponse =
        Restate.virtualObjectHandle(MyObject.class, objectKey)
            .call(MyObject::myHandler, request)
            .await();

    // Call a Workflow
    String wfResponse =
        Restate.workflowHandle(MyWorkflow.class, workflowId).call(MyWorkflow::run, request).await();
    // <end_service_calls>
  }

  public void genericServiceCalls() {
    String request = "Hi";

    // <start_generic_calls>
    // Generic service call
    Target target = Target.service("MyService", "myHandler");
    String response =
        Restate.call(
                Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();

    // Generic object call
    Target objectTarget = Target.virtualObject("MyObject", "object-key", "myHandler");
    String objResponse =
        Restate.call(
                Request.of(
                    objectTarget, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();

    // Generic workflow call
    Target workflowTarget = Target.workflow("MyWorkflow", "wf-id", "run");
    String wfResponse =
        Restate.call(
                Request.of(
                    workflowTarget, TypeTag.of(String.class), TypeTag.of(String.class), request))
            .await();
    // <end_generic_calls>
  }

  public void oneWayMessages() {
    String request = "Hi";
    String objectKey = "Hi";
    String workflowId = "Hi";

    // <start_sending_messages>
    // Call a Service
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, request);

    // Call a Virtual Object
    Restate.virtualObjectHandle(MyObject.class, objectKey).send(MyObject::myHandler, request);

    // Call a Workflow
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
  }

  public void durableTimers() {
    // <start_durable_timers>
    // Sleep
    Restate.sleep(Duration.ofSeconds(30));

    // Schedule delayed call (different from sleep + send)
    Restate.serviceHandle(MyService.class).send(MyService::myHandler, "Hi", Duration.ofHours(5));
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

    // Resolve from another handler
    Restate.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");

    // Reject from another handler
    Restate.awakeableHandle(awakeableId).reject("Cannot be reviewed");
    // <end_awakeables>
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
    // Wait for any to complete
    int indexCompleted = DurableFuture.any(call1, call2).await();
    // <end_combine_any>
  }

  public void invocationManagement() {
    var request = "";

    // <start_cancel>
    var handle =
        Restate.serviceHandle(MyService.class)
            .send(MyService::myHandler, request, InvocationOptions.idempotencyKey("abc123"));
    var response = handle.attach().await();
    // Cancel invocation
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
