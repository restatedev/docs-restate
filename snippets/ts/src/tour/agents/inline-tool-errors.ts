import * as restate from "@restatedev/restate-sdk";

export default restate.service({
  name: "WeatherAgent",
  handlers: {
    run: async (ctx: restate.Context, { prompt }: { prompt: string }) => {
      // <start_here>
      // Without ctx.run - error goes straight to agent
      async function myTool() {
        const result = await fetch("/api/data"); // Might fail due to network
        // If this fails, agent gets the error immediately
      }

      // With ctx.run - Restate handles retries
      async function myToolWithRestate(ctx: restate.Context) {
        const result = await ctx.run("fetch-data", () => fetch("/api/data"));
        // Network failures get retried automatically
        // Only terminal errors reach the AI
      }
      // <end_here>
    },
  },
});
