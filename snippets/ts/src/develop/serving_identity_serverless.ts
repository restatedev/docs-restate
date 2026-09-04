import * as restate from "@restatedev/restate-sdk/fetch";

const myService = restate.service({
  name: "MyService",
  handlers: {},
});

// <start_identity>
const handler = restate.createEndpointHandler({
  services: [myService],
  identityKeys: ["publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f"],
});
// <end_identity>

export default handler;
