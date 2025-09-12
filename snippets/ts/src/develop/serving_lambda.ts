const myService = restate.service({
  name: "MyService",
  handlers: {},
});

const myVirtualObject = restate.object({
  name: "MyVirtualObject",
  handlers: {},
});

const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: { run: async () => {} },
});

// <start_lambda>
import * as restate from "@restatedev/restate-sdk/lambda";
export const handler = restate.createEndpointHandler({
    services: [myService, myVirtualObject, myWorkflow],
});
// <end_lambda>
