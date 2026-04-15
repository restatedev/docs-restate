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

// <start_endpoint_hook>
restate.serve({
  services: [myService],
  hooks: [loggingHook],
});
// <end_endpoint_hook>

// <start_otel_hook>
import { openTelemetryHook } from "@restatedev/restate-sdk-opentelemetry";
import { trace } from "@opentelemetry/api";

const greeter = restate.service({
  name: "Greeter",
  options: {
    hooks: [openTelemetryHook({ tracer: trace.getTracer("greeter-service") })],
  },
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // Add events to the active span
      trace.getActiveSpan()?.addEvent("processing_started", { name });

      // ctx.run gets its own child span automatically
      const greeting = await ctx.run("compute-greeting", async () => {
        return `Hello ${name}!`;
      });

      return greeting;
    },
  },
});
// <end_otel_hook>
