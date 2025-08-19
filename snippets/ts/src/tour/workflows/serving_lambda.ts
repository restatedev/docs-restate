const signupWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: { run: async () => {} },
});

// <start_lambda>
import * as restate from "@restatedev/restate-sdk/lambda";
export const handler = restate
  .endpoint()
  .bind(signupWorkflow)
  .handler();
// <end_lambda>
