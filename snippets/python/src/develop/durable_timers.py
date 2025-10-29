from datetime import timedelta

from restate import Service, Context
import restate

my_service = Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, arg):
    # <start_here>
    await ctx.sleep(delta=timedelta(seconds=10))
    # <end_here>


@my_service.handler()
async def timer_handler(ctx: Context, arg):

    # <start_timer>
    match await restate.select(
        greeting=ctx.service_call(my_handler, "Hi"),
        timeout=ctx.sleep(timedelta(seconds=5)),
    ):
        case ["greeting", greeting]:
            print("Greeting:", greeting)
        case _:
            print("Timeout occurred")
    # <end_timer>
