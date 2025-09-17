import * as restate from "@restatedev/restate-sdk";
import {durableCalls} from "@restatedev/vercel-ai-middleware";

import { openai } from "@ai-sdk/openai";
import { generateText, wrapLanguageModel, ModelMessage } from "ai";

async function runAgent(ctx: restate.ObjectContext, messages: Message[]) {
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
  });
  const res = await generateText({
    model,
    system: "You are a helpful assistant.",
    prompt: "something",
  });

  return res;
}

type Message = {};

// <start_here>
restate.object({
  name: "Chat",
  handlers: {
    message: async (ctx: restate.ObjectContext, message: string) => {
      const messages = (await ctx.get<Message[]>("messages")) ?? [];
      messages.push({ role: "user", content: message });

      const result = await runAgent(ctx, messages);

      ctx.set("messages", [...messages, ...result.response.messages]);
      return result.text;
    },
  },
});
// <end_here>
