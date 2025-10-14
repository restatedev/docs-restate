package cancellation;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.annotation.Handler;

@Service
public class CancellationExample {

  // <start_here>
  @Handler
  public void processOrder(Context ctx, Order order) {
    // If cancellation happened before this line, this still executes
    ctx.set("status", "processing");

    // If cancellation happened before this line, this still executes
    String paymentId = ctx.random().nextUUID().toString();
    try {

      // If cancelled right before this line, ctx.run won't execute
      // If cancelled during run block execution,
      // then a terminal exception gets thrown here once execution finishes
      ctx.run(() -> processPayment(paymentId, order));

      // If cancellation happened right before this line, this still executes
      NotificationServiceClient.fromContext(ctx)
          .send()
          .notify(order.getUserId(), "Payment processed");

    } catch (TerminalException e) {
      // Cancellation detected - run compensation
      ctx.run(() -> refundPayment(paymentId, order));
      throw e; // Re-throw to propagate cancellation
    }
  }
  // <end_here>

  private void processPayment(String paymentId, Order order) {
  }

  private void refundPayment(String paymentId, Order order) {
  }
}
