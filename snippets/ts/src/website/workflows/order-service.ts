import * as restate from "@restatedev/restate-sdk";

type Order = {
  id: string;
  items: { id: string; quantity: number }[];
  creditCard: string;
};

function chargePayment(creditCard: string, paymentId: string) {
  return undefined;
}

function reserveInventory(id: string, quantity: number) {
  return undefined;
}

// <start_here>
restate.service({
  name: "OrderService",
  handlers: {
    process: async (ctx: restate.Context, order: Order) => {
      // Each step is automatically durable and resumable
      const paymentId = ctx.rand.uuidv4();

      await ctx.run(() => chargePayment(order.creditCard, paymentId));

      for (const item of order.items) {
        await ctx.run(() => reserveInventory(item.id, item.quantity));
      }
      return { success: true, paymentId };
    },
  },
});
// <end_here>
