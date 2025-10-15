package develop.agentsmd;

import dev.restate.sdk.*;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import dev.restate.common.Target;
import dev.restate.common.Request;
import dev.restate.serde.TypeTag;
import develop.MyObjectClient;
import develop.MyServiceClient;
import develop.MyWorkflowClient;

import java.time.Duration;
import java.util.Collection;
import java.util.concurrent.CompletableFuture;



public class Actions {

    public void stateOperations(ObjectContext ctx) {
        // <start_state>
        // Get state keys
        Collection<String> keys = ctx.stateKeys();

        // Get state
        StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
        String stringState = ctx.get(STRING_STATE_KEY).orElse("my-default");

        StateKey<Integer> INT_STATE_KEY = StateKey.of("count", Integer.class);
        int count = ctx.get(INT_STATE_KEY).orElse(0);

        // Set state
        ctx.set(STRING_STATE_KEY, "my-new-value");
        ctx.set(INT_STATE_KEY, count + 1);

        // Clear state
        ctx.clear(STRING_STATE_KEY);
        ctx.clearAll();
        // <end_state>
    }

    public void serviceCommunication(Context ctx) {
        String request = "Hi";
        String objectKey = "object-key";
        String workflowId = "wf-id";

        // <start_service_calls>
        // Call a Service
        String svcResponse = MyServiceClient.fromContext(ctx).myHandler(request).await();

        // Call a Virtual Object
        String objResponse = MyObjectClient.fromContext(ctx, objectKey).myHandler(request).await();

        // Call a Workflow
        String wfResponse = MyWorkflowClient.fromContext(ctx, workflowId).run(request).await();
        // <end_service_calls>
    }

    public void genericServiceCalls(Context ctx) {
        String request = "Hi";

        // <start_generic_calls>
        // Generic service call
        Target target = Target.service("MyService", "myHandler");
        String response = ctx.call(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), request)).await();

        // Generic object call
        Target objectTarget = Target.virtualObject("MyObject", "object-key", "myHandler");
        String objResponse = ctx.call(Request.of(objectTarget, TypeTag.of(String.class), TypeTag.of(String.class), request)).await();

        // Generic workflow call
        Target workflowTarget = Target.workflow("MyWorkflow", "wf-id", "run");
        String wfResponse = ctx.call(Request.of(workflowTarget, TypeTag.of(String.class), TypeTag.of(String.class), request)).await();
        // <end_generic_calls>
    }

    public void oneWayMessages(Context ctx) {
        String request = "Hi";
        String objectKey = "Hi";
        String workflowId = "Hi";

        // <start_sending_messages>
        // Call a Service
        MyServiceClient.fromContext(ctx).send().myHandler(request);

        // Call a Virtual Object
        MyObjectClient.fromContext(ctx, objectKey).send().myHandler(request);

        // Call a Workflow
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
    }

    public void durableTimers(Context ctx) {
        // <start_durable_timers>
        // Sleep
        ctx.sleep(Duration.ofSeconds(30));

        // Schedule delayed call (different from sleep + send)
        Target target = Target.service("MyService", "myHandler");
        ctx.send(Request.of(target, TypeTag.of(String.class), TypeTag.of(String.class), "Hi"), Duration.ofHours(5));
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

        // Resolve from another handler
        ctx.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");

        // Reject from another handler
        ctx.awakeableHandle(awakeableId).reject("Cannot be reviewed");
        // <end_awakeables>
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
        // Wait for any to complete
        int indexCompleted = DurableFuture.any(call1, call2).await();
        // <end_combine_any>
    }

    public void invocationManagement(Context ctx) {
        var request = "";

        // <start_cancel>
        var handle =
                MyServiceClient.fromContext(ctx)
                        .send()
                        .myHandler(request, req -> req.idempotencyKey("abc123"));
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