import * as restate from "@restatedev/restate-sdk";
import {
  Context,
  RestatePromise,
  WorkflowContext,
  WorkflowSharedContext,
} from "@restatedev/restate-sdk";

class User {}

function activateUser(userId: string) {
  return undefined;
}

function sendWelcomeEmail(user: User) {
  return undefined;
}

export const userSignup = restate.workflow({
  name: "user-signup",
  handlers: {
    run: async (ctx: restate.WorkflowContext, user: User) => {
      const order = { id: "order123", amount: 1500 }; // Example order

      // <start_state>
      // Store intermediate results
      ctx.set("payment-status", "completed");
      ctx.set("order-details", order);
      // <end_state>

      // <start_approval>
      // Wait for external approval
      const approval = await ctx.promise<boolean>("manager-approval");
      // <end_approval>

      // <start_timers>
      // Wait for user action with timeout
      try {
        const userAction = ctx
          .promise<string>("user-response")
          .get()
          .orTimeout({ hours: 24 });
      } catch (error) {
        if (error instanceof restate.TimeoutError) {
          // Handle timeout
        }
        // Handle other errors
      }
      // <end_timers>

      return { success: true };
    },
    // <start_approve>
    // External system resolves the promise
    approve: async (ctx: restate.WorkflowSharedContext, decision: boolean) => {
      await ctx.promise<boolean>("manager-approval").resolve(decision);
    },
    // <end_approve>
    // <start_state_get>
    // Query from external handler
    getOrderStatus: async (ctx: restate.WorkflowSharedContext) => {
      return {
        payment: await ctx.get("payment-status"),
        order: await ctx.get("order-details"),
      };
    },
    // <end_state_get>
  },
});
