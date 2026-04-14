import * as restate from "@restatedev/restate-sdk";

// <start_hook_provider>
const myHookProvider: restate.HooksProvider = (ctx) => ({
  interceptor: {
    handler: async (next) => {
      console.log(`before ${ctx.request.target}`);
      try {
        await next();
      } finally {
        console.log(`after ${ctx.request.target}`);
      }
    },
    run: async (name, next) => {
      console.log(`  run "${name}" executing`);
      await next();
    },
  },
});
// <end_hook_provider>

const myVirtualObject = restate.object({
  name: "MyVirtualObject",
  handlers: {},
});

const myWorkflow = restate.workflow({
  name: "MyWorkflow",
  handlers: { run: async () => {} },
});

// <start_service_hooks>
const myService = restate.service({
  name: "MyService",
  handlers: { /* ... */ },
  options: {
    hooks: [myHookProvider],
  },
});
// <end_service_hooks>

// <start_endpoint_hooks>
restate.serve({
  services: [myService, myVirtualObject, myWorkflow],
  options: {
    hooks: [myHookProvider],
  },
});
// <end_endpoint_hooks>

// <start_otel>
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
      trace.getActiveSpan()?.addEvent("my.event", { name });

      // ctx.run closures automatically get a child span
      const greeting = await ctx.run("compute-greet", async () => {
        return `Hello ${name}!`;
      });

      return greeting;
    },
  },
});

restate.serve({ services: [greeter] });
// <end_otel>
