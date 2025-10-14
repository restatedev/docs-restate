package cancellation;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TerminalException;

public class CancellationExample {
  public void processOrder(Context ctx, Order order) {
    // This executes - not an await point
    ctx.set("status", "processing");

    try {
      // If cancelled before this await, run won't execute
      // If cancelled during execution, then gets thrown after the execution
      Payment payment = ctx.run(() -> processPayment(order));

      // These one-way calls execute even if cancellation happened right before
      NotificationServiceClient.fromContext(ctx)
          .send()
          .notify(order.getUserId(), "Payment processed");

    } catch (TerminalException e) {
      // Cancellation detected - run compensation
      ctx.run(() -> refundPayment(order));
      throw e; // Re-throw to propagate cancellation
    }
  }
}
