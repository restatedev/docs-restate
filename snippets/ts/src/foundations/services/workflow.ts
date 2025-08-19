import * as restate from "@restatedev/restate-sdk";
import {handlers} from "@restatedev/restate-sdk";


function createUserEntry(user: { name: string; email: string }) {
    return undefined;
}

function sendEmailWithLink(param: { userId: string; user: { name: string; email: string }; secret: string }) {
    return undefined;
}

// <start_here>
const signupWorkflow = restate.workflow({
    name: "user-signup",
    handlers: {
        run: async (
            ctx: restate.WorkflowContext,
            user: { name: string; email: string }
        ) => {
            // workflow ID = user ID; workflow runs once per user
            const userId = ctx.key;

            await ctx.run(() => createUserEntry(user));

            const secret = ctx.rand.uuidv4();
            await ctx.run(() => sendEmailWithLink({ userId, user, secret }));

            const clickSecret = await ctx.promise<string>("link-clicked");
            return clickSecret === secret;
        },

        click: async (
            ctx: restate.WorkflowSharedContext,
            request: { secret: string }
        ) => {
            await ctx.promise<string>("link-clicked").resolve(request.secret);
        },
    },
});
// <end_here>

export default signupWorkflow;