import * as restate from "@restatedev/restate-sdk";
import type { HooksProvider } from "@restatedev/restate-sdk";

// <start_basic_hook>
const loggingHook: HooksProvider = (ctx) => ({
  interceptor: {
    handler: async (next) => {
      console.log(`Handler starting: ${ctx.request.target}`);
      try {
        await next();
        console.log(`Handler completed: ${ctx.request.target}`);
      } catch (e) {
        console.log(`Handler error: ${ctx.request.target}: ${e}`);
        throw e;
      }
    },
    run: async (name, next) => {
      console.log(`  Run "${name}" starting`);
      try {
        await next();
        console.log(`  Run "${name}" completed`);
      } catch (e) {
        console.log(`  Run "${name}" error: ${e}`);
        throw e;
      }
    },
  },
});
// <end_basic_hook>

// <start_service_hook>
const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: restate.Context, name: string) => {
      return `Hello ${name}!`;
    },
  },
  options: {
    hooks: [loggingHook],
  },
});
// <end_service_hook>


