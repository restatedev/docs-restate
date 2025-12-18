import * as restate from "@restatedev/restate-sdk";

// Type definitions
interface Order {
  userId: string;
  amount: number;
  id: string;
}

// Service stubs
const notificationService = restate.service({
  name: "notificationService",
  handlers: {
    notify: async (ctx: restate.Context, message: string) => {},
  },
});
// Function stubs
async function processPayment(
  paymentId: string,
  order: Order
): Promise<string> {
  // Simulate payment processing
  return "payment_id_" + order.id;
}

async function refundPayment(paymentId: string, order: Order): Promise<void> {
  // Simulate refund processing
}

// <start_here>
async function processOrder(ctx: restate.ObjectContext, order: Order) {
  // If cancellation happened before this line, this still executes
  ctx.set("status", "processing");

  // If cancellation happened before this line, this still executes
  const paymentId = ctx.rand.uuidv4().toString();

  try {
    // If cancelled right before this line, ctx.run won't execute
    // If cancelled during run block execution,
    // then a terminal error gets thrown here once execution finishes
    await ctx.run(() => processPayment(paymentId, order));

    // If cancellation happened before this line, this still executes
    ctx.serviceSendClient(notificationService).notify("Payment processed");
  } catch (error) {
    if (error instanceof restate.TerminalError) {
      // Cancellation detected - run compensation
      await ctx.run(() => refundPayment(paymentId, order));
      throw error; // Re-throw to propagate cancellation
    }
  }
}
// <end_here>
