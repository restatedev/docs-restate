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

// <start_fetch>
import * as restate from "@restatedev/restate-sdk/fetch";
const handler = restate.createEndpointHandler({
  services: [myService, myVirtualObject, myWorkflow],
});
// Cloudflare expects the handler as a default export
export default handler;
// <end_fetch>
