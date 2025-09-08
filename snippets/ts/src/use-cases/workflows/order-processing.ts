import * as restate from "@restatedev/restate-sdk";
import { RestatePromise, WorkflowContext } from "@restatedev/restate-sdk";

function checkForFraud(order: Order) {
  return undefined;
}

function chargePayment(order: Order) {
  return { success: true };
}

function reserveInventory(order: Order) {
  return { success: true };
}

type Order = {
  id: string;
  amount: number;
};

// <start_here>
export const orderProcessing = restate.workflow({
  name: "order-processing",
  handlers: {
    run: async (ctx: WorkflowContext, order: Order) => {
      // Use regular if/else, loops, and functions
      if (order.amount > 1000) {
        await ctx.run("fraud-check", () => checkForFraud(order));
      }

      // Parallel execution with Promise.all equivalent
      const [payment, inventory] = await RestatePromise.all([
        ctx.run("charge", () => chargePayment(order)),
        ctx.run("reserve", () => reserveInventory(order)),
      ]);

      return { success: payment.success && inventory.success };
    },
  },
});
// <end_here>
