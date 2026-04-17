# Python Google ADK Integration Reference

## Installation

```bash
pip install restate-sdk[adk]
```

Or with uv:

```bash
uv add "restate-sdk[adk]"
```

---

## Core Pattern

Add `RestatePlugin()` to the ADK App's plugins list. Use `restate_context().run_typed()` inside tool functions for durable side effects.

---

## Complete Weather Agent Example

```python
import restate
from restate.ext.adk import RestatePlugin, restate_context
from google.adk import Runner
from google.adk.apps import App
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from google.adk.agents.llm_agent import Agent
from pydantic import BaseModel

class WeatherPrompt(BaseModel):
    user_id: str = "user-123"
    message: str = "What is the weather like in San Francisco?"

async def get_weather(city: str) -> dict:
    """Get the current weather for a given city."""
    async def call_weather_api(city: str) -> dict:
        return {"temperature": 23, "description": "Sunny and warm."}
    return await restate_context().run_typed(
        f"Get weather {city}", call_weather_api, city=city
    )

agent = Agent(
    model="gemini-2.5-flash",
    name="weather_agent",
    instruction="You are a helpful agent that provides weather updates.",
    tools=[get_weather],
)

APP_NAME = "agents"
app = App(name=APP_NAME, root_agent=agent, plugins=[RestatePlugin()])
session_service = InMemorySessionService()

agent_service = restate.Service("agent")

@agent_service.handler()
async def run(ctx: restate.Context, req: WeatherPrompt) -> str | None:
    session_id = str(ctx.uuid())
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=req.user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=req.user_id, session_id=session_id
        )

    runner = Runner(app=app, session_service=session_service)
    events = runner.run_async(
        user_id=req.user_id,
        session_id=session_id,
        new_message=Content(role="user", parts=[Part.from_text(text=req.message)]),
    )

    final_response = None
    async for event in events:
        if event.is_final_response() and event.content and event.content.parts:
            if event.content.parts[0].text:
                final_response = event.content.parts[0].text
    return final_response

app = restate.app([agent_service])
```

---

## Key Requirements

- **`RestatePlugin()` handles durability** -- add it to the App's `plugins` list.
- **Use `ctx.uuid()` for deterministic session IDs** -- ensures consistent session across replays.
- **Use `restate_context().run_typed()`** for all side effects inside tool functions.

---

## Template

```bash
restate example python-google-adk-template
```
