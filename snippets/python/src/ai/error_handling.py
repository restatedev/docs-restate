import restate
from restate import Context, Service
from restate import RunOptions
from restate.ext.pydantic import restate_context

my_service = Service("MyService")


def fetch_data(req: str) -> str:
    return ""


@my_service.handler("myServiceHandler")
async def my_service_handler(ctx: Context, req: str) -> str:
    # <start_retries>
    result = await restate_context().run_typed(
        "fetch data",
        fetch_data,
        RunOptions(max_attempts=3),
        req=req,
    )
    # <end_retries>

    # <start_retries_restate>
    result = await ctx.run_typed(
        "fetch data",
        fetch_data,
        RunOptions(max_attempts=3),
        req=req,
    )
    # <end_retries_restate>


    # <start_terminal>
    from restate import TerminalError

    raise TerminalError("This tool is not allowed to run for this input.")
    # <end_terminal>
