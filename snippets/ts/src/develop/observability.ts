import * as restate from "@restatedev/restate-sdk";
import type { Context, HooksProvider } from "@restatedev/restate-sdk";

// <start_log_hook>
const logHook: HooksProvider = (ctx) => {
  const { service, handler } = ctx.request.target;
  const tag = `${service}/${handler} [${ctx.request.id}]`;

  return {
    interceptor: {
      handler: async (next) => {
        console.log(`→ ${tag} attempt started`);
        try {
          await next();
          console.log(`✓ ${tag}`);
        } catch (e) {
          console.log(`✗ ${tag}: ${e}`);
          throw e;
        }
      },
      run: async (name, next) => {
        try {
          await next();
          console.log(`  ✓ run "${name}"`);
        } catch (e) {
          console.log(`  ✗ run "${name}": ${e}`);
          throw e;
        }
      },
    },
  };
};
// <end_log_hook>

// <start_hook_service>
const myService = restate.service({
  name: "MyService",
  handlers: {
    myHandler: async (ctx: Context, name: string) => {
      return `Hello, ${name}!`;
    },
  },
  options: {
    hooks: [logHook],
  },
});
// <end_hook_service>

// <start_otel_hook>
import { openTelemetryHook } from "@restatedev/restate-sdk-opentelemetry";
import { trace } from "@opentelemetry/api";

const greeter = restate.service({
  name: "Greeter",
  options: {
    hooks: [openTelemetryHook({ tracer: trace.getTracer("greeter-service") })],
  },
  handlers: {
    greet: async (ctx: Context, name: string) => {
      // Span events added here are automatically associated with this invocation attempt
      trace.getActiveSpan()?.addEvent("my.event", { name });

      // ctx.run() closures get their own child span automatically
      const greeting = await ctx.run("compute-greet", async () => {
        return `Hello ${name}!`;
      });

      return greeting;
    },
  },
});
// <end_otel_hook>

// <start_endpoint_hook>
import * as http from "node:http";

const endpoint = restate.serve({
  services: [myService],
});
// <end_endpoint_hook>
