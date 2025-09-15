import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

class User {}

function activateUser(userId: string) {
  return undefined;
}

function sendWelcomeEmail(user: User) {
  return undefined;
}

function createUser(userId: string, user: User) {
  return undefined;
}

// <start_here>
export const userSignup = restate.workflow({
  name: "user-signup",
  handlers: {
    run: async (ctx: WorkflowContext, user: User) => {
      const userId = ctx.key; // unique workflow key

      // Use regular if/else, loops, and functions
      const success = await ctx.run("create", () => createUser(userId, user));
      if (!success) return { success };

      // Execute durable steps
      await ctx.run("activate", () => activateUser(userId));
      await ctx.run("welcome", () => sendWelcomeEmail(user));

      return { success: true };
    },
  },
});
// <end_here>
