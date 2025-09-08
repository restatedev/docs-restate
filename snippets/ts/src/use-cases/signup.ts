import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

class User {}

function activateUser(userId: string) {
  return undefined;
}

function sendWelcomeEmail(user: User) {
  return undefined;
}

// <start_here>
export const userSignup = restate.workflow({
  name: "user-signup",
  handlers: {
    run: async (ctx: WorkflowContext, user: User) => {
      const userId = ctx.key;

      // Move user DB interaction to dedicated service
      const success = await ctx
        .serviceClient(userService)
        .createUser({ userId, user });
      if (!success) return { success };

      // Execute other steps inline
      await ctx.run("activate", () => activateUser(userId));
      await ctx.run("welcome", () => sendWelcomeEmail(user));

      return { success: true };
    },
  },
});
// <end_here>

const userService = restate.service({
  name: "user-service",
  handlers: {
    createUser: async (
      ctx: restate.Context,
      req: { userId: string; user: User }
    ) => {
      // Simulate DB call
      console.log(`Creating user ${req.userId}`);
      return true;
    },
  },
});
