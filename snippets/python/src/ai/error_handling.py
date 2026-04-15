import restate
from restate import Context, Service
from restate.exceptions import TerminalError


my_service = Service("MyService")


def fetch_data() -> str:
    return ""


@my_service.handler("myServiceHandler")
async def my_service_handler(ctx: Context, greeting: str) -> str:
    # <start_retries>
    result = await restate_context().run_typed(
        "fetch data",
        fetch_data,
        RunOptions(max_attempts=3),
        req=city,
    )
    # <end_retries>


    # <start_terminal>
    from restate import TerminalError

    raise TerminalError("This tool is not allowed to run for this input.")
    # <end_terminal>
