# Python OpenAI Agents SDK Integration Reference

## Installation

```bash
pip install restate-sdk[serde]
```

## Core Pattern

Use `DurableRunner.run(agent, message)` to run an agent durably. Decorate tool functions with `@durable_function_tool` and use `restate_context()` inside tools for durable steps.

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/openai-agents/template/agent.py"} 
```

## Key Requirements

- **Configure retry attempts** via `RunOptions` when needed.
- **Use `restate_context()`** actions for all steps inside tools.
- **Decorate tool functions with `@durable_function_tool`** to make them durable.
- The plugin executes tool calls always in sequence.

## Template

```bash
restate example python-openai-agents-template
```

## Durable Sessions

To add session management to the agent:

```python{"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/openai-agents/tour-of-agents/app/chat_agent.py#here"} 
```

## More Examples

`github.com/restatedev/ai-examples/openai-agents/`
