# TypeScript Vercel AI SDK Integration Reference

## Installation

```bash
npm install @restatedev/vercel-ai-middleware ai @ai-sdk/openai
```

---

## Basic Example

Use the Restate middleware to wrap the language model:

```ts {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/vercel-ai/template/src/app.ts"} 
import * as restate from "@restatedev/restate-sdk";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool, wrapLanguageModel } from "ai";
import { z } from "zod";

async function getWeather(ctx: restate.Context, city: string) {
  return ctx.run(`get weather ${city}`, () => {
    return { temperature: 23, description: `Sunny and warm.` };
  });
}

const run = async (ctx: restate.Context, { prompt }: { prompt: string }) => {
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
  });

  const { text } = await generateText({
    model,
    system: "You are a helpful agent that provides weather updates.",
    prompt,
    tools: {
      getWeather: tool({
        description: "Get the current weather for a given city.",
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => getWeather(ctx, city),
      }),
    },
    stopWhen: [stepCountIs(5)],
    providerOptions: { openai: { parallelToolCalls: false } },
  });

  return text;
};

const agent = restate.service({
  name: "agent",
  handlers: {
    run: restate.createServiceHandler(
      {
        input: restate.serde.schema(
          z.object({
            prompt: z.string().default("What's the weather in San Francisco?"),
          })
        ),
      },
      run
    ),
  },
});

restate.serve({ services: [agent] });
```

## Key Requirements

- **Set run options on `durableCalls`** to prevent infinite LLM retries.
- **Set `providerOptions: { openai: { parallelToolCalls: false } }` on generateText** -- parallel tool calls break replay.
- **Wrap all side effects in context actions inside tools.**
- **Streaming is not supported** -- `durableCalls` waits for the full response before journaling.

## Template

```bash
restate example typescript-vercel-ai-template
```

## More Examples

`github.com/restatedev/ai-examples/vercel-ai/`
