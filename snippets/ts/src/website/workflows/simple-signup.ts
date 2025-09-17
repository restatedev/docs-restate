import * as restate from "@restatedev/restate-sdk";

class User {}

function activateUser(userId: User) {
  return undefined;
}

function sendWelcomeEmail(user: User) {
  return undefined;
}

function createUser(user: User) {
  return undefined;
}

// <start_here>
restate.workflow({
  name: "user-signup",
  handlers: {
    run: async (ctx: restate.WorkflowContext, user: User) => {
      // Use regular if/else, loops, and functions
      const success = await ctx.run(() => createUser(user));
      if (!success) return { success };

      // Execute durable steps
      await ctx.run(() => activateUser(user));
      await ctx.run(() => sendWelcomeEmail(user));

      return { success: true };
    },
  },
});
// <end_here>
