// <start_here>
import * as restate from "@restatedev/restate-sdk";

export const signupWorkflow = restate.workflow({
    name: "user-signup",
    handlers: {
        run: async (ctx: restate.WorkflowContext, user: User) => {
            const userId = ctx.key; // workflow ID = user ID
            // ... implement your workflow logic here ...
        }
    }
})

restate.endpoint().bind(signupWorkflow).listen(9080);
// <end_here>

type User ={}
