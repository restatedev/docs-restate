import * as restate from "@restatedev/restate-sdk";

// <start_one_shot>
async function waitForApproval(ctx: restate.Context) {
  const approved = await ctx.signal<boolean>("approval");
  return approved;
}
// <end_one_shot>

// <start_wait>
async function reviseUntilDone(ctx: restate.Context, topic: string) {
  let draft = `Research notes for ${topic}`;

  while (true) {
    // Each call waits for the next resolution of the named signal.
    const text = await ctx.signal<string>("steer");
    if (text === "done") {
      return draft;
    }
    draft = `${draft}\n${text}`;
  }
}
// <end_wait>

type SteerRequest = {
  invocationId: restate.InvocationId;
  text: string;
};

// <start_resolve>
async function steerInvocation(ctx: restate.Context, request: SteerRequest) {
  ctx
    .invocation(request.invocationId)
    .signal<string>("steer")
    .resolve(request.text);
}
// <end_resolve>

void reviseUntilDone;
void steerInvocation;
void waitForApproval;
