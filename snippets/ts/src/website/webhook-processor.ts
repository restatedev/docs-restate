import * as restate from "@restatedev/restate-sdk";

function onPaymentSuccess(ctx: restate.Context, event: StripeEvent) {

}

function onPaymentFailed(ctx: restate.Context, event: StripeEvent) {

}

// <start_here>
restate.service({
  name: "WebhookProcessor",
  handlers: {
    onStripeEvent: async (ctx: restate.Context, event: StripeEvent) => {
      if (event.type === "invoice.payment_failed") {
        onPaymentFailed(ctx, event);
      } else if (event.type === "invoice.payment_succeeded") {
        onPaymentSuccess(ctx, event);
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
