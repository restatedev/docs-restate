package foundations.actions;

import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;

// Example Workflow that demonstrates workflow actions
@Workflow
public class WorkflowExample {
  private static final DurablePromiseKey<PaymentResult> PAYMENT_COMPLETED =
      DurablePromiseKey.of("payment-completed", PaymentResult.class);
  private static final DurablePromiseKey<Boolean> MANAGER_APPROVAL =
      DurablePromiseKey.of("manager-approval", Boolean.class);
  private static final DurablePromiseKey<PaymentResult> PAYMENT =
      DurablePromiseKey.of("payment", PaymentResult.class);
  private static final DurablePromiseKey<InventoryResult> INVENTORY =
      DurablePromiseKey.of("inventory", InventoryResult.class);

  @Workflow
  public void run(WorkflowContext ctx) {
    // <start_workflow_promises>
    // Wait for external event
    PaymentResult paymentResult = ctx.promise(PAYMENT_COMPLETED).future().await();

    // Wait for human approval
    Boolean approved = ctx.promise(MANAGER_APPROVAL).future().await();

    // Wait for multiple events
    var paymentFuture = ctx.promise(PAYMENT).future();
    var inventoryFuture = ctx.promise(INVENTORY).future();
    PaymentResult payment = paymentFuture.await();
    InventoryResult inventory = inventoryFuture.await();
    // <end_workflow_promises>
  }

  // <start_signal_functions>
  // In a signal function
  @Shared
  public void confirmPayment(SharedWorkflowContext ctx, PaymentResult result) {
    ctx.promiseHandle(PAYMENT_COMPLETED).resolve(result);
  }

  // In a signal function
  @Shared
  public void approveRequest(SharedWorkflowContext ctx, Boolean approved) {
    ctx.promiseHandle(MANAGER_APPROVAL).resolve(approved);
  }
  // <end_signal_functions>
}
