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
export const orderService = restate.service({
  name: "OrderService",
  handlers: {
    process: async (ctx: restate.Context, order: Order) => {
      // Each step is automatically durable and resumable
      const paymentId = ctx.rand.uuidv4();

      const payment = await ctx.run("charge", () =>
        chargePayment(order.creditCard, paymentId)
      );

      for (const item of order.items) {
        await ctx.run(`reserve-${item.id}`, () =>
          reserveInventory(item.id, item.quantity)
        );
      }

      return { success: true, paymentId };
    },
  },
});
// <end_here>
