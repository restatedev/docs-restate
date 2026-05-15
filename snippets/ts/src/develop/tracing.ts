// <start_otel_hook>
import * as restate from "@restatedev/restate-sdk";
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