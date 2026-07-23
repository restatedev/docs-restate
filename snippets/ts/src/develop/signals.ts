import * as restate from "@restatedev/restate-sdk";

async function waitForApproval(ctx: restate.Context) {
  // <start_one_shot>
  const approved = await ctx.signal<boolean>("approval");
  // <end_one_shot>
  return approved;
}

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

async function steerInvocation(ctx: restate.Context, request: SteerRequest) {
  // <start_resolve>
  ctx
    .invocation(request.invocationId)
    .signal<string>("steer")
    .resolve(request.text);
  // <end_resolve>
}

void reviseUntilDone;
void steerInvocation;
void waitForApproval;
