import * as restate from "@restatedev/restate-sdk";
import * as clients from "@restatedev/restate-sdk-clients";
import { rpc } from "@restatedev/restate-sdk";
import sendOpts = rpc.sendOpts;

export const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context, greeting: string) => {
      return `${greeting}!`;
    },
  },
});

const greeterService = restate.service({
  name: "GreeterService",
  handlers: {
    greet: async (ctx: restate.Context, { greeting }: { greeting: string }) => {
      // <start_attach>
      const handle = ctx
        .serviceSendClient(myService)
        .myHandler("Hi", sendOpts({ idempotencyKey: "my-key" }));
      const invocationId = await handle.invocationId;

      // Later...
      const response = ctx.attach(invocationId);
      // <end_attach>
      return `${greeting}!`;
    },
    cancel: async (
      ctx: restate.Context,
      { greeting }: { greeting: string }
    ) => {
      // <start_cancel>
      const handle = ctx.serviceSendClient(myService).myHandler("Hi");
      const invocationId = await handle.invocationId;

      // Cancel the invocation
      ctx.cancel(invocationId);
      // <end_cancel>
    },
  },
});

async function call() {
  // <start_here>
  //import * as clients from "@restatedev/restate-sdk-clients";
  const restateClient = clients.connect({ url: "http://localhost:8080" });

  // To call a service:
  const greet = await restateClient
    .serviceClient(greeterService)
    .greet({ greeting: "Hi" });
  // <end_here>
}
