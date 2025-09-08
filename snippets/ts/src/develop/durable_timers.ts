import * as restate from "@restatedev/restate-sdk";
import { myService } from "./my_service";

const service = restate.service({
  name: "DurableTimers",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_sleep>
      await ctx.sleep({ seconds: 10 });
      // <end_sleep>

      // <start_timer>
      try {
        await ctx
          .serviceClient(myService)
          .myHandler("Hi")
          .orTimeout({ seconds: 5 });
      } catch (error) {
        if (error instanceof restate.TimeoutError) {
          console.error("Operation timed out:", error);
        } else {
          throw error; // Re-throw other errors
        }
      }
      // <end_timer>
    },
  },
});
