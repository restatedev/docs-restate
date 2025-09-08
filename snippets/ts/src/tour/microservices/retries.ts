import * as restate from "@restatedev/restate-sdk";
import { Context } from "@restatedev/restate-sdk";

type SubscriptionRequest = {
  userId: string;
  creditCard: string;
  subscriptions: string[];
};

function createRecurringPayment(creditCard: string, paymentId: string) {
  return undefined;
}

export const subscriptionService = restate.service({
  name: "SubscriptionService",
  handlers: {
    add: async (ctx: Context, req: SubscriptionRequest) => {
      const paymentId = ctx.rand.uuidv4();

      // <start_retries>
      const retryPolicy = {
        maxRetryAttempts: 3,
        initialRetryIntervalMillis: 1000,
      };

      const payRef = await ctx.run(
        "pay",
        () => createRecurringPayment(req.creditCard, paymentId),
        retryPolicy
      );
      // <end_retries>
    },
  },
});
