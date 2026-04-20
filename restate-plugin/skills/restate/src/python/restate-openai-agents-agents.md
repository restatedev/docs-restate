# Python OpenAI Agents SDK Integration Reference

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

Use `DurableRunner.run(agent, message)` to run an agent durably. Decorate tool functions with `@durable_function_tool` and use `restate_context()` inside tools for durable steps.

---

## Complete Weather Agent Example

```python
import restate
from agents import Agent
from pydantic import BaseModel
from restate.ext.openai import restate_context, DurableRunner, durable_function_tool

class WeatherPrompt(BaseModel):
    message: str = "What is the weather in San Francisco?"

@durable_function_tool
async def get_weather(city: str) -> dict:
    """Get the current weather for a given city."""
    async def call_weather_api(city: str) -> dict:
        return {"temperature": 23, "description": "Sunny and warm."}
    return await restate_context().run_typed(
        f"Get weather {city}", call_weather_api, city=city
    )

weather_agent = Agent(
    name="WeatherAgent",
    instructions="You are a helpful agent that provides weather updates.",
    tools=[get_weather],
)

agent_service = restate.Service("agent")

@agent_service.handler()
async def run(_ctx: restate.Context, req: WeatherPrompt) -> str:
    result = await DurableRunner.run(weather_agent, req.message)
    return result.final_output

app = restate.app([agent_service])
```

---

## Key Requirements

- **Configure retry attempts** via `LlmRetryOpts` when needed.
- **Use `restate_context().run_typed()`** for all side effects inside tools.
- **Do not use parallel tool calls** -- they break replay.
- **Decorate tool functions with `@durable_function_tool`** to make them durable.

---

## Template

```bash
restate example python-openai-agents-template
```

## More Examples

`github.com/restatedev/ai-examples/openai-agents/`
