# Python Pydantic AI Integration Reference

## Installation

```bash
pip install restate-sdk[serde]
```

Or with uv:

```bash
uv add "restate-sdk[serde]"
```

---

## Core Pattern

Wrap a Pydantic AI `Agent` with `RestateAgent(agent)` for durable execution. Use `restate_context()` inside tool functions for durable step.

---

## Complete Weather Agent Example

```python
import restate
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from restate.ext.pydantic import RestateAgent, restate_context

class WeatherPrompt(BaseModel):
    message: str = "What is the weather in San Francisco?"

weather_agent = Agent(
    "openai:gpt-4o-mini",
    system_prompt="You are a helpful agent that provides weather updates.",
)

@weather_agent.tool()
async def get_weather(_run_ctx: RunContext[None], city: str) -> dict:
    """Get the current weather for a given city."""
    async def call_weather_api(city: str) -> dict:
        return {"temperature": 23, "description": "Sunny and warm."}
    return await restate_context().run_typed(
        f"Get weather {city}", call_weather_api, city=city
    )

restate_agent = RestateAgent(weather_agent)
agent_service = restate.Service("agent")

@agent_service.handler()
async def run(_ctx: restate.Context, req: WeatherPrompt) -> str:
    result = await restate_agent.run(req.message)
    return result.output

app = restate.app([agent_service])
```

---

## Key Requirements

- **`RestateAgent` wraps the Pydantic AI agent** for durable execution.
- **Use `restate_context().run_typed()`** for all side effects inside tool functions.
- **Register tools with the original Pydantic AI agent** (`@weather_agent.tool()`) before wrapping with `RestateAgent`.

---

## Template

```bash
restate example python-pydantic-ai-template
```

## More Examples

`github.com/restatedev/ai-examples/pydantic-ai/`