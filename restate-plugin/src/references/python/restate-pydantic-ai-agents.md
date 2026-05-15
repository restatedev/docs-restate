# Python Pydantic AI Integration Reference

## Installation

```bash
pip install restate-sdk[serde]
```

## Core Pattern

Wrap a Pydantic AI `Agent` with `RestateAgent(agent)` for durable execution. Use `restate_context()` inside tool functions for durable step.

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/pydantic-ai/template/agent.py"} 
```

## Key Requirements

- **`RestateAgent` wraps the Pydantic AI agent** for durable execution.
- **Use `restate_context()`** actions for all durable steps inside tool functions.
- The plugin executes tool calls always in sequence.

## Template

```bash
restate example python-pydantic-ai-template
```

## Durable Sessions

To add session management to the agent: 

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/pydantic-ai/tour-of-agents/app/chat_agent.py#here"} 
```

## More Examples

`github.com/restatedev/ai-examples/pydantic-ai/`