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
        await ctx.run_typed(
            "write",
            write_to_other_system,
            restate.RunOptions(
                # Initial retry interval
                initial_retry_interval=timedelta(milliseconds=100),
                # Retry policies are exponential, the retry interval will double on each attempt
                retry_interval_factor=2.0,
                # Maximum retry interval
                max_retry_interval=timedelta(seconds=10),
                # Max duration of retries before giving up
                max_duration=timedelta(minutes=5),
                # Max attempts (including the initial) before giving up
                max_attempts=10,
            ))
    except TerminalError as err:
        # Handle the terminal error after retries exhausted
        # For example, undo previous actions (see sagas guide) and
        # propagate the error back to the caller
        raise err
    # <end_here>

    return f"${greeting}!"


app = restate.app([my_service])
