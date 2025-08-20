import * as restate from "@restatedev/restate-sdk";

type SubscriptionRequest = {
  userId: string;
  creditCard: string;
  subscriptions: string[];
};

function createRecurringPayment(creditCard: string, paymentId: string) {
  return undefined;
}

function createSubscription(userId: string, subscription: string, payRef: any) {
  return undefined;
}

// <start_here>
const subscriptionService = restate.service({
  name: "SubscriptionService",
  handlers: {
    add: async (ctx: restate.Context, req: SubscriptionRequest) => {
      const paymentId = ctx.rand.uuidv4();

      const payRef = await ctx.run(() =>
        createRecurringPayment(req.creditCard, paymentId)
      );

      for (const subscription of req.subscriptions) {
        await ctx.run(() =>
          createSubscription(req.userId, subscription, payRef)
        );
      }
    },
  },
});
// <end_here>

export default subscriptionService;
