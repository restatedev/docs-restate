import * as restate from "@restatedev/restate-sdk";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, wrapLanguageModel } from "ai";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import {
  InsuranceClaim,
  InsuranceClaimSchema,
  requestHumanReview,
} from "./utils";

function requestManagerApproval(request: string) {
  return undefined;
}

// <start_here>
restate.workflow({
  name: "ApprovalWorkflow",
  handlers: {
    run: async (
      ctx: restate.WorkflowContext,
      request: string
    ): Promise<boolean> => {
      await ctx.run(() => requestManagerApproval(request));
      // Wait for the durable promise in the workflow
      return ctx.promise("manager-approval");
    },
    approveRequest: async (
      ctx: restate.WorkflowSharedContext,
      approved: boolean
    ) => {
      // Resolve the durable promise in a signal handler
      await ctx.promise("manager-approval").resolve(approved);
    },
  },
});
// <end_here>
