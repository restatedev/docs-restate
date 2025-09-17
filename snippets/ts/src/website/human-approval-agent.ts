import * as restate from "@restatedev/restate-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, wrapLanguageModel } from "ai";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import {
  InsuranceClaim,
  InsuranceClaimSchema,
  requestHumanReview,
} from "./utils";

restate.service({
  name: "ClaimEvaluationAgent",
  handlers: {
    run: async (ctx: restate.Context, prompt: string) => {
      // <start_here>
      const model = wrapLanguageModel({
        model: openai("gpt-4o"),
        middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
      });

      const { text } = await generateText({
        model,
        system: "You are an insurance claim evaluation agent.",
        prompt,
        tools: {
          humanApproval: tool({
            description: "Ask for human approval for high-value claims.",
            inputSchema: InsuranceClaimSchema,
            execute: async (claim: InsuranceClaim): Promise<boolean> => {
              const approval = ctx.awakeable<boolean>();
              await ctx.run(() => requestHumanReview(claim, approval.id));
              return approval.promise;
            },
          }),
        },
      });
      // <end_here>
      return text;
    },
  },
});
