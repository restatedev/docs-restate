# Python Google ADK Integration Reference

## Installation

```bash
pip install restate-sdk[serde]
```

## Core Pattern

Add `RestatePlugin()` to the ADK App's plugins list. Use `restate_context()` Context actions inside tool functions for durable steps.

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/google-adk/template/agent.py"} 
```

## Key Requirements

- **`RestatePlugin()` handles durability** -- add it to the App's `plugins` list.
- **Configure retry attempts** via `RunOptions` when needed.
- **Use `restate_context()`** actions for all durable steps inside tool functions.
- The plugin executes tool calls always in sequence.

## Template

```bash
restate example python-google-adk-template
```

## Durable Sessions

To add session management to the agent:

```python {"CODE_LOAD::https://raw.githubusercontent.com/restatedev/ai-examples/refs/heads/main/google-adk/tour-of-agents/app/chat_agent.py#here"} 
```

## More Examples

`github.com/restatedev/ai-examples/google-adk/`