import * as restate from "@restatedev/restate-sdk";
import { myService } from "../develop/service";

function writeToOtherSystem() {
  return undefined;
}

function decodeRequest(body: Uint8Array) {
  return "";
}

const service = restate.service({
  name: "MyService",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_here>
      const myRunRetryPolicy = {
        initialRetryInterval: { milliseconds: 500 },
        retryIntervalFactor: 2,
        maxRetryInterval: { seconds: 1 },
        maxRetryAttempts: 5,
        maxRetryDuration: { seconds: 1 },
      };
      await ctx.run("write", () => writeToOtherSystem(), myRunRetryPolicy);
      // <end_here>

      // <start_catch>
      try {
        // Fails with a terminal error after 3 attempts or if the function throws one
        await ctx.run("write", () => writeToOtherSystem(), {
          maxRetryAttempts: 3,
        });
      } catch (e) {
        if (e instanceof restate.TerminalError) {
          // Handle the terminal error: undo previous actions and
          // propagate the error back to the caller
        }
        throw e;
      }
      // <end_catch>
    },
    // <start_raw>
    myHandler: async (ctx: restate.Context) => {
      try {
        const rawRequest = ctx.request().body;
        const decodedRequest = decodeRequest(rawRequest);

        // ... rest of your business logic ...
      } catch (e) {
        if (e instanceof restate.TerminalError) {
          // Propagate to DLQ/catch-all handler
        }
        throw e;
      }
    },
    // <end_raw>

    myTimeoutHandler: async (ctx: restate.Context) => {
      // <start_timeout>
      try {
        // If the timeout hits first, it throws a `TimeoutError`.
        // If you do not catch it, it will lead to a retry.
        await ctx
          .serviceClient(myService)
          .myHandler("hello")
          .orTimeout({ seconds: 5 });

        const { id, promise } = ctx.awakeable();
        // do something that will trigger the awakeable
        await promise.orTimeout({ seconds: 5 });
      } catch (e) {
        if (e instanceof restate.TimeoutError) {
          // Handle the timeout error
        }
        throw e;
      }
      // <end_timeout>
    },
  },
});
