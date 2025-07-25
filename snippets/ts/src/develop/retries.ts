import * as restate from "@restatedev/restate-sdk";

function writeToOtherSystem() {
  return undefined;
}

const service = restate.service({
  name: "MyService",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_here>
      try {
        const myRunRetryPolicy = {
          initialRetryInterval: { milliseconds: 500 },
          retryIntervalFactor: 2,
          maxRetryInterval: { seconds: 1 },
          maxRetryAttempts: 5,
          maxRetryDuration: { seconds: 1 },
        };
        await ctx.run("write", () => writeToOtherSystem(), myRunRetryPolicy);
      } catch (e) {
        if (e instanceof restate.TerminalError) {
          // Undo or compensate here (see Sagas guide)
        }
        throw e;
      }
      // <end_here>
    },
  },
});

const paymentClient = {
  call: (txId: string, amt: number) => {
    return { error: "", isSuccess: false };
  },
};
