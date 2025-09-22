import * as restate from "@restatedev/restate-sdk";
import { wrapLanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { durableCalls } from "@restatedev/vercel-ai-middleware";

async function run(restateContext: restate.Context) {
  // <start_here>
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(restateContext, { maxRetryAttempts: 3 }),
  });
  // <end_here>
}
