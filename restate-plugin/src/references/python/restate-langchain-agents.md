# Python LangChain Integration Reference

Use the Restate Python SDK 1.x integration with LangChain and LangGraph 1.x. Before upgrading an existing project across a major version, inspect its dependency constraints and migration guides.

## Installation

Start from the maintained template:

```bash
restate example python-langchain-template
```

The maintained template currently targets Python 3.13 or newer.

For an existing project, install the Restate serialization extra, LangChain, LangGraph, and the chosen model provider:

```bash
pip install "restate-sdk[serde]>=1.0,<2" "langchain>=1,<2" "langgraph>=1,<2" langchain-openai
```

## Core pattern

Attach `RestateMiddleware()` to a `create_agent` agent and invoke the agent from inside a Restate handler. Inside tools, obtain the active context with `restate_context()` and wrap side effects in `run_typed()`.

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/langchain-python/template/agent.py"} 
```

## What the middleware guarantees

- `RestateMiddleware` journals each model response so recovery replays it instead of calling the model again.
- It linearizes a batch of LangChain tool calls into a deterministic order for Restate replay.
- It does **not** journal the tool body. Wrap every external call or side effect inside a tool with `restate_context().run_typed()`.
- It must execute inside a Restate handler. Calling the agent without an active Restate context fails.

Do not add native `asyncio.gather()` around tool or model calls. Use Restate concurrency primitives for parallel workflows outside the LangChain agent loop.

## Retries and terminal failures

Use `RunOptions` on the middleware to bound model-call retries. Configure expensive or fragile tool steps separately:

```python {"CODE_LOAD::python/src/develop/skillsmd/langchain.py#retry_policy"}
```

When a context action exhausts its retries, let `restate.TerminalError` propagate out of the tool and agent unless the handler has an explicit fallback. Do not convert Restate suspension or terminal failures into ordinary messages for the model.

## Durable sessions

Use a Virtual Object keyed by conversation ID and store typed LangChain messages in Restate state:

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/langchain-python/tour-of-agents/app/chat_agent.py#here"} 
```

Preserve the full LangChain message types and tool-call metadata when storing history. Bound long-running histories with a durable summarization or archival step.

## Common pitfalls

- Adding `RestateMiddleware` journals model calls, not arbitrary code in tools.
- Invoking `agent.invoke()` uses the synchronous path. Use `await agent.ainvoke(...)` inside an asynchronous Restate handler.
- Framework built-in tools can perform hidden I/O. Confirm that each one is journaled or replace it with an explicit durable tool.
- A LangGraph checkpointer and Restate Virtual Object state are separate state systems. Choose an intentional source of truth instead of accidentally persisting the same conversation twice.
- Returning `result["messages"][-1].content` may not be a string for every model or structured-output configuration. Match the handler output type to the configured agent response.

## More examples

- Tour and templates: https://github.com/restatedev/ai-examples/tree/main/langchain-python
- LangChain documentation: https://docs.restate.dev/ai/sdk-integrations/langchain
- Framework-neutral Restate agent guidance: `references/ai-agents.md`
