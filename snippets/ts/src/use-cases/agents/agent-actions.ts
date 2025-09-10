import * as restate from "@restatedev/restate-sdk";
import { durableCalls } from "./middleware";

import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool, wrapLanguageModel } from "ai";
import { RestatePromise } from "@restatedev/restate-sdk";

function sendApprovalRequest(id: string, decision: string) {
  return undefined;
}

type Claim = {
  amount: number;
  type: string;
  description: string;
};

// <start_here>
const agent = restate.service({
  name: "Agent",
  handlers: {
    run: async (ctx: restate.Context, { prompt }: { prompt: string }) => {
      const claim = {
        amount: 1500,
        type: "theft",
        description: "stolen bike",
      } as Claim;
      const model = wrapLanguageModel({
        model: openai("gpt-4o"),
        middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
      });
      const request = "";

      // <start_approval>
      const approval = ctx.awakeable<boolean>();
      await ctx.run("request-approval", () =>
        sendApprovalRequest(approval.id, request)
      );
      const approved = await approval.promise;
      // <end_approval>

      // <start_multi>
      const [eligibility, fraud, cost] = await RestatePromise.all([
        ctx.serviceClient(eligibilityAgent).analyze(claim),
        ctx.serviceClient(fraudAgent).analyze(claim),
        ctx.serviceClient(costAgent).analyze(claim),
      ]);

      const decision = await generateText({
        model,
        prompt: `Make decision based on: ${eligibility}, ${fraud}, ${cost}`,
      });
      // <end_multi>
    },
  },
});
// <end_here>

const eligibilityAgent = restate.service({
  name: "EligibilityAgent",
  handlers: {
    analyze: async (ctx: restate.Context, claim: any) => {
      return "eligible";
    },
  },
});

const fraudAgent = restate.service({
  name: "FraudAgent",
  handlers: {
    analyze: async (ctx: restate.Context, claim: any) => {
      return "low risk";
    },
  },
});

const costAgent = restate.service({
  name: "CostAgent",
  handlers: {
    analyze: async (ctx: restate.Context, claim: any) => {
      return "reasonable";
    },
  },
});
