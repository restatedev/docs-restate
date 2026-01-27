import * as restate from "@restatedev/restate-sdk";

export const myAgent = restate.service({
    name: "my-agent",
    handlers: {
        run: async (ctx: restate.Context, {message}: {message: string}) => {
            return `${message}!`;
        },
    },
});

// <start_export>
export type MyAgent = typeof myAgent;
// <end_export>
