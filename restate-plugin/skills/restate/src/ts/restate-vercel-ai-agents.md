# TypeScript Vercel AI SDK Integration Reference

## Installation

```bash
npm install @restatedev/vercel-ai-middleware ai @ai-sdk/openai
```

## Basic Example

Use the Restate middleware to wrap the language model:

```ts {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/vercel-ai/template/src/app.ts"} 
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
