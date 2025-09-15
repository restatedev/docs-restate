import * as http2 from "http2";

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

// <start_endpoint>
import * as restate from "@restatedev/restate-sdk";
restate.serve({
  services: [myService, myVirtualObject, myWorkflow],
});
// <end_endpoint>

// <start_custom_endpoint>
const http2Handler = restate.createEndpointHandler({
  services: [myService, myVirtualObject, myWorkflow],
});
const httpServer = http2.createServer(http2Handler);
httpServer.listen();
// <end_custom_endpoint>

// <start_identity>
restate.serve({
  services: [myService],
  identityKeys: ["publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f"],
});
// <end_identity>
