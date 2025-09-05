import * as restate from "@restatedev/restate-sdk";

function createUserEntry(req: { userId: string; user: { name: string; email: string }}) {
  return undefined;
}

function sendVerificationEmail(param: {
  user: { name: string; email: string };
  secret: string;
}) {
  return undefined;
}

// <start_here>
const signupWorkflow = restate.workflow({
  name: "UserSignup",
  handlers: {
    run: async (ctx: restate.WorkflowContext, user: { name: string; email: string }) => {
      // workflow ID = user ID; workflow runs once per user
      const userId = ctx.key;

      await ctx.run("create", () => createUserEntry({ userId, user }));

      const secret = ctx.rand.uuidv4();
      await ctx.run("mail", () => sendVerificationEmail({ user, secret }));

      const clickSecret = await ctx.promise<string>("email-link-clicked");
      return clickSecret === secret;
    },

    click: async (ctx: restate.WorkflowSharedContext, request: { secret: string }) => {
      await ctx.promise<string>("email-link-clicked").resolve(request.secret);
    },
  },
});
// <end_here>

export default signupWorkflow;
