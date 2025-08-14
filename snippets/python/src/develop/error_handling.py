from datetime import timedelta

from restate import Service, Context

my_service = Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, arg):
    # <start_here>
    from restate.exceptions import TerminalError

    raise TerminalError("Something went wrong.")
    # <end_here>
