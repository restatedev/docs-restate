import * as restate from "@restatedev/restate-sdk";

async function processOrder(ctx: restate.Context, order: Order) {
  // This executes - not an await point
  ctx.set("status", "processing");

  try {
    // If cancelled before this await, ctx.run won't execute
    // If cancelled during execution, then gets thrown after the execution and before returning result to Restate
    const payment = await ctx.run(() => processPayment(order));

    // These one-way calls execute even if cancellation happened right before
    ctx.send(notificationService).notify(order.userId, "Payment processed");

  } catch (error) {
    if (error instanceof restate.TerminalError) {
      // Cancellation detected - run compensation
      await ctx.run(() => refundPayment(order));
      throw error; // Re-throw to propagate cancellation
    }
  }
}
