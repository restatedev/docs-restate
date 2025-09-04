import restate
from restate import Context
import asyncio
from typing import Dict, Any

my_service = restate.Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, greeting: str) -> str:
    return f"{greeting}!"


greeter_service = restate.Service("GreeterService")


@greeter_service.handler()
async def greet(ctx: Context, req: Dict[str, str]) -> str:
    greeting = req["greeting"]

    # <start_attach>
    handle = ctx.service_send(my_handler, "Hi", idempotency_key="my-key")
    invocation_id = await handle.invocation_id()

    # Later...
    await ctx.attach_invocation(invocation_id)
    # <end_attach>
    return f"{greeting}!"


@greeter_service.handler()
async def cancel(ctx: Context, req: Dict[str, str]) -> None:
    greeting = req["greeting"]

    # <start_cancel>
    handle = ctx.service_send(my_handler, "Hi", idempotency_key="my-key")
    invocation_id = await handle.invocation_id()

    # Cancel the invocation
    ctx.cancel_invocation(invocation_id)
    # <end_cancel>
