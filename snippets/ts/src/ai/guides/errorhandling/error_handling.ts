import * as restate from "@restatedev/restate-sdk";

export const myAgent = restate.service({
    name: "my-agent",
    handlers: {
        run: async (ctx: restate.Context, { message }: { message: string }) => {

            // <start_retries>
            const result = await ctx.run(
                "fetch-data",
                () => fetch("/api/data"),
                { maxRetryAttempts: 3 }
            );
            // <end_retries>
            return `${message}!`;
        },
    },
});
