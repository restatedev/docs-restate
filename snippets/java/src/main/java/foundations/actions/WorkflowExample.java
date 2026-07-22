package foundations.actions;

import dev.restate.sdk.Restate;
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
  public void run() {
    // <start_workflow_promises>
    // Wait for external event
    PaymentResult paymentResult = Restate.promise(PAYMENT_COMPLETED).future().await();

    // Wait for human approval
    Boolean approved = Restate.promise(MANAGER_APPROVAL).future().await();

    // Wait for multiple events
    var paymentFuture = Restate.promise(PAYMENT).future();
    var inventoryFuture = Restate.promise(INVENTORY).future();
    PaymentResult payment = paymentFuture.await();
    InventoryResult inventory = inventoryFuture.await();
    // <end_workflow_promises>
  }

  // <start_workflow_promise_handlers>
  // In a workflow shared handler
  @Shared
  public void confirmPayment(PaymentResult result) {
    Restate.promiseHandle(PAYMENT_COMPLETED).resolve(result);
  }

  // In a workflow shared handler
  @Shared
  public void approveRequest(Boolean approved) {
    Restate.promiseHandle(MANAGER_APPROVAL).resolve(approved);
  }
  // <end_workflow_promise_handlers>
}
