from datetime import timedelta

import restate
from requests import options
from restate import Context, Service
from restate.exceptions import TerminalError

my_service = Service("MyService")


def write_to_other_system():
    pass


@my_service.handler("myHandler")
async def my_service_handler(ctx: Context, greeting: str) -> str:
    # <start_here>
    try:
        retry_opts = restate.RunOptions(
            max_attempts=10, max_retry_duration=timedelta(seconds=30)
        )
        await ctx.run_typed("write", write_to_other_system, retry_opts)
    except TerminalError as err:
        # Handle the terminal error after retries exhausted
        # For example, undo previous actions (see sagas guide) and
        # propagate the error back to the caller
        raise err
    # <end_here>

    return f"${greeting}!"


app = restate.app([my_service])
