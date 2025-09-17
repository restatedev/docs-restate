import * as restate from "@restatedev/restate-sdk";
import { RestatePromise, rpc } from "@restatedev/restate-sdk";
import sendOpts = rpc.sendOpts;

type Order = {
  id: string;
  items: { id: string; quantity: number }[];
  creditCard: string;
};

class PaymentResult {}

function startPayment(order: Order, id: string) {
  return undefined;
}

function processItem(item: { id: string; quantity: number }) {
  return undefined;
}

function dayBefore(concertDate: Date) {
  return undefined;
}

export const myService = restate.service({
  name: "MyService",
  handlers: {
    process: async (ctx: restate.Context, order: Order) => {
      const req = { item: "item-123", concertDate: new Date(), id: order.id };

      // <start_communication>
      // Request-response: Wait for result
      const payRef = await ctx.serviceClient(paymentService).charge(req);

      // Fire-and-forget: Guaranteed delivery without waiting
      ctx.serviceSendClient(emailService).emailTicket(req);

      // Delayed execution: Schedule for later
      ctx
        .serviceSendClient(emailService)
        .sendReminder(order, sendOpts({ delay: dayBefore(req.concertDate) }));
      // <end_communication>

      // <start_awakeables>
      // Wait for external payment confirmation
      const confirmation = ctx.awakeable<PaymentResult>();
      await ctx.run(() => startPayment(order, confirmation.id));
      await confirmation.promise.orTimeout({ minutes: 30 });
      // <end_awakeables>

      // <start_parallel>
      // Process all items in parallel
      const itemPromises = order.items.map((item) =>
        ctx.run(() => processItem(item))
      );

      await RestatePromise.all(itemPromises);
      // <end_parallel>
    },
  },
});

const paymentService = restate.service({
  name: "InventoryService",
  handlers: {
    charge: async (ctx: restate.Context, item: object) => {
      // Simulate stock check
      return { item, inStock: true };
    },
  },
});

const emailService = restate.service({
  name: "EmailService",
  handlers: {
    emailTicket: async (ctx: restate.Context, order: object) => {
      // Simulate sending email
      console.log(`Sending confirmation for order`);
    },
    sendReminder: async (ctx: restate.Context, order: Order) => {
      // Simulate sending reminder
      console.log(`Sending reminder for order ${order.id}`);
    },
  },
});