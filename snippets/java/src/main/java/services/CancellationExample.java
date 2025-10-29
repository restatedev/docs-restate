package services;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import foundations.actions.NotificationServiceClient;
import usecases.microservices.utils.Order;

@VirtualObject
public class CancellationExample {

  StateKey<String> STATUS = StateKey.of("status", String.class);

  // <start_here>
  @Handler
  public void processOrder(ObjectContext ctx, Order order) {
    // If cancellation happened before this line, this still executes
    ctx.set(STATUS, "processing");

    // If cancellation happened before this line, this still executes
    String paymentId = ctx.random().nextUUID().toString();
    try {

      // If canceled right before this line, ctx.run won't execute
      // If canceled during run block execution,
      // then a terminal exception gets thrown here once execution finishes
      ctx.run(() -> processPayment(paymentId, order));

      // If cancellation happened right before this line, this still executes
      NotificationServiceClient.fromContext(ctx).send().sendNotification("Your order is processed");

    } catch (TerminalException e) {
      // Cancellation detected - run compensation
      ctx.run(() -> refundPayment(paymentId, order));
      throw e; // Re-throw to propagate cancellation
    }
  }

  // <end_here>

  private void processPayment(String paymentId, Order order) {}

  private void refundPayment(String paymentId, Order order) {}
}
