import random
import typing

from restate import Service, Context, RestateDurableCallFuture
from datetime import timedelta
from restate.exceptions import TerminalError
import restate

my_service = Service("MyService")


def send_verification():
    pass


def fetch_user_data(user_id: int) -> dict:
    # Simulate fetching user data
    return {"user_id": user_id, "name": "John Doe"}


def fetch_order_history(user_id: int) -> list:
    # Simulate fetching order history
    return [
        {"order_id": 1, "user_id": user_id, "item": "Book"},
        {"order_id": 2, "user_id": user_id, "item": "Pen"},
    ]


analytics_service = Service("AnalyticsService")


@analytics_service.handler()
async def calculate_metrics(ctx: Context, user_id: int) -> dict:
    # Simulate calculating metrics
    return {"user_id": user_id, "metrics": {"purchases": 5, "visits": 10}}


@my_service.handler()
async def my_handler(ctx: Context, arg):
    # <start_side_effect>
    async def call_llm(prompt: str) -> str:
        # ... implement ...
        return "llm response"

    # specify the (async) function to call and its arguments
    result = await ctx.run_typed("LLM call", call_llm, prompt="What is the weather?")

    # or use a lambda to capture a single value
    my_number = await ctx.run_typed("generate number", lambda: random.randint(0, 10))
    # <end_side_effect>

    # <start_uuid>
    my_uuid = ctx.uuid()
    # <end_uuid>

    # <start_random_nb>
    ctx.random().random()
    # <end_random_nb>

    # <start_time>
    current_time = await ctx.time()
    # <end_time>

    # <start_parallel>
    # Start operations concurrently
    call1 = ctx.run_typed("fetch_user", fetch_user_data, user_id=123)
    call2 = ctx.run_typed("fetch_orders", fetch_order_history, user_id=123)
    call3 = ctx.service_call(calculate_metrics, arg=123)

    # Now wait for results as needed
    user = await call1
    orders = await call2
    metrics = await call3
    # <end_parallel>

    # <start_all>
    claude = ctx.service_call(claude_sonnet, arg=f"What is the weather?")
    openai = ctx.service_call(open_ai, arg=f"What is the weather?")

    results_done = await restate.gather(claude, openai)
    results = [await result for result in results_done]
    # <end_all>

    # <start_select>
    _, confirmation_future = ctx.awakeable(type_hint=str)
    match await restate.select(
        confirmation=confirmation_future, timeout=ctx.sleep(timedelta(days=1))
    ):
        case ["confirmation", "ok"]:
            return "success!"
        case ["confirmation", "deny"]:
            raise TerminalError("Confirmation was denied!")
        case _:
            raise TerminalError("Verification timer expired!")
    # <end_select>


@my_service.handler()
async def my_other_handler(ctx: Context, arg):
    async def call_llm(prompt: str, model: str) -> str:
        # ... implement ...
        return "llm response"

    # <start_as_completed>
    call1 = ctx.run_typed(
        "LLM call", call_llm, prompt="What is the weather?", model="gpt-4"
    )
    call2 = ctx.run_typed(
        "LLM call", call_llm, prompt="What is the weather?", model="gpt-3.5-turbo"
    )
    async for future in restate.as_completed(call1, call2):
        # do something with the completed future
        print(await future)
    # <end_as_completed>

    # <start_wait_completed>
    claude = ctx.service_call(claude_sonnet, arg=f"What is the weather?")
    openai = ctx.service_call(open_ai, arg=f"What is the weather?")

    pending, done = await restate.wait_completed(claude, openai)

    # collect the completed results
    results = [await f for f in done]

    # cancel the pending calls
    for f in pending:
        call_future = typing.cast(RestateDurableCallFuture, f)
        ctx.cancel_invocation(await call_future.invocation_id())
    # <end_wait_completed>


@my_service.handler()
async def claude_sonnet(ctx: Context, req: str) -> str:
    return f"Bonjour!"


@my_service.handler()
async def open_ai(ctx: Context, req: str) -> str:
    await ctx.sleep(timedelta(minutes=1))
    return f"Hello!"
