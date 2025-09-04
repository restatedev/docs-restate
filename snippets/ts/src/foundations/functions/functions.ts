import * as restate from "@restatedev/restate-sdk";

type MyInput = {}

function processData(input: MyInput) {
    return undefined;
}

// <start_here>
async function myHandler(ctx: restate.Context, input: MyInput) {
    const result = await ctx.run("process", () => processData(input));
    return { success: true, result };
}
// <end_here>