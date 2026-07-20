from langchain_core.tools import tool


@tool
async def get_weather(city: str) -> dict[str, object]:
    """Get the current weather for a city."""
    return {"city": city, "temperature": 23}


# <start_retry_policy>
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from restate import RunOptions
from restate.ext.langchain import RestateMiddleware

agent = create_agent(
    model=init_chat_model("openai:gpt-5.4"),
    tools=[get_weather],
    middleware=[RestateMiddleware(run_options=RunOptions(max_attempts=3))],
)
# <end_retry_policy>
