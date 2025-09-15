package usecases.workflows;

import static usecases.workflows.utils.DomainModels.*;

import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.common.TimeoutException;
import java.time.Duration;
import java.util.Map;

@Workflow
public class WorkflowActions {
  private static final StateKey<String> PAYMENT_STATUS =
      StateKey.of("payment-status", String.class);
  private static final StateKey<OrderDetails> ORDER_DETAILS =
      StateKey.of("order-details", OrderDetails.class);
  private static final DurablePromiseKey<Boolean> APPROVAL_PROMISE =
      DurablePromiseKey.of("manager-approval", Boolean.class);
  private static final DurablePromiseKey<String> USER_RESPONSE_PROMISE =
      DurablePromiseKey.of("user-response", String.class);

  @Handler
  public Map<String, Boolean> run(WorkflowContext ctx, User user) {
    OrderDetails order = new OrderDetails("order123", 1500);

    // <start_state>
    // Store intermediate results
    ctx.set(PAYMENT_STATUS, "completed");
    ctx.set(ORDER_DETAILS, order);
    // <end_state>

    // <start_approval>
    // Wait for external approval
    var approval = ctx.promise(APPROVAL_PROMISE);
    Boolean decision = approval.future().await();
    // <end_approval>

    // <start_timers>
    // Wait for user action with timeout
    try {
      var userResponse = ctx.promise(USER_RESPONSE_PROMISE).future().await(Duration.ofHours(24));
    } catch (TimeoutException e) {
      // Handle timeout
    }
    // <end_timers>

    return Map.of("success", true);
  }

  // <start_approve>
  // External system resolves the promise
  @Shared
  public void approve(SharedWorkflowContext ctx, boolean decision) {
    ctx.promiseHandle(APPROVAL_PROMISE).resolve(decision);
  }

  // <end_approve>

  // <start_state_get>
  // Query from external handler
  @Shared
  public OrderDetails getOrderDetails(SharedWorkflowContext ctx) {
    return ctx.get(ORDER_DETAILS).orElseThrow(() -> new TerminalException("Order not found"));
  }
  // <end_state_get>
}
