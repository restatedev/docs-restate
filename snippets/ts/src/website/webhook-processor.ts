import * as restate from "@restatedev/restate-sdk";

// <start_here>
restate.service({
  name: "WebhookProcessor",
  handlers: {
    // Any handler can be a durable webhook processor that never loses events
    // You don't need to do anything special for this.
    // Just point your webhook to the handler endpoint: restate:8080/WebhookProcessor/onStripeEvent
    onStripeEvent: async (ctx: restate.Context, event: StripeEvent) => {
      if (event.type === "invoice.payment_failed") {
        ctx
          .objectSendClient(paymentTracker, event.data.object.id)
          .onPaymentFailed(event);
      } else if (event.type === "invoice.payment_succeeded") {
        ctx
          .objectSendClient(paymentTracker, event.data.object.id)
          .onPaymentSuccess(event);
      }
    },
  },
});
// <end_here>

export type StripeEvent = {
  id: string; // event id
  type: string;
  created: number;
  data: {
    object: {
      id: string; // invoice id
      customer: string;
    };
  };
};

// Have a look at the scheduling tasks example (../schedulingtasks/payment_reminders.ts)
// to see a full implementation of this
const paymentTracker = restate.object({
  name: "PaymentTracker",
  handlers: {
    onPaymentFailed: async (
      ctx: restate.ObjectContext,
      event: StripeEvent
    ) => {},
    onPaymentSuccess: async (
      ctx: restate.ObjectContext,
      event: StripeEvent
    ) => {},
  },
});
