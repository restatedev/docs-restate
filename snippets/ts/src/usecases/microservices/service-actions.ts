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

export const myService = restate.service({
  name: "MyService",
  handlers: {
    process: async (ctx: restate.Context, order: Order) => {
      const item = "item-123";

      // <start_communication>
      // Request-response: Wait for result
      const result = await ctx.serviceClient(inventoryService).checkStock(item);

      // Fire-and-forget: Guaranteed delivery without waiting
      ctx.serviceSendClient(emailService).sendConfirmation(order);

      // Delayed execution: Schedule for later
      ctx
        .serviceSendClient(reminderService)
        .sendReminder(order, sendOpts({ delay: { days: 7 } }));
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

const inventoryService = restate.service({
  name: "InventoryService",
  handlers: {
    checkStock: async (ctx: restate.Context, item: string) => {
      // Simulate stock check
      return { item, inStock: true };
    },
  },
});

const emailService = restate.service({
  name: "EmailService",
  handlers: {
    sendConfirmation: async (ctx: restate.Context, order: Order) => {
      // Simulate sending email
      console.log(`Sending confirmation for order ${order.id}`);
    },
  },
});

const reminderService = restate.service({
  name: "ReminderService",
  handlers: {
    sendReminder: async (ctx: restate.Context, order: Order) => {
      // Simulate sending reminder
      console.log(`Sending reminder for order ${order.id}`);
    },
  },
});
