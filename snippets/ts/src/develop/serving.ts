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
import * as http from "node:http";
import * as http2 from "node:http2";

const restateHandler = restate.createEndpointHandler({
  services: [myService, myVirtualObject, myWorkflow],
});

// HTTP/1.1
const http1Server = http.createServer(restateHandler);
http1Server.listen(9080);

// HTTP/2
const http2Server = http2.createServer(restateHandler);
http2Server.listen(9080);
// <end_custom_endpoint>

// <start_identity>
restate.serve({
  services: [myService],
  identityKeys: ["publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f"],
});
// <end_identity>
