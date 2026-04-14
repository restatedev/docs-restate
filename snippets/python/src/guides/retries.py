from datetime import timedelta

import restate
from restate import Context, Service
from restate.exceptions import TerminalError

my_service = Service("MyService")


def write_to_other_system():
    pass


@my_service.handler("myServiceHandler")
async def my_service_handler(ctx: Context, greeting: str) -> str:
    # <start_here>
    await ctx.run_typed(
        "write",
        write_to_other_system,
        restate.RunOptions(
            # Max number of retry attempts to complete the action.
            max_attempts=3,
            # Max duration for retrying, across all retries.
            max_retry_duration=timedelta(seconds=10),
        )
    )
    # <end_here>

    # <start_catch>
    try:
        # Fails with a terminal error after 3 attempts or if the function throws one
        await ctx.run_typed("write", write_to_other_system, restate.RunOptions(max_attempts=3))
    except TerminalError as err:
        # Handle the terminal error: undo previous actions and
        # propagate the error back to the caller
        raise err
    # <end_catch>

    # <start_timeout>
    match await restate.select(
        greeting=ctx.service_call(my_service_handler, "value"),
        timeout=ctx.sleep(timedelta(seconds=5)),
    ):
        case ["greeting", greeting]:
            print("Greeting:", greeting)
        case ["timeout", _]:
            print("Timeout occurred")
    # <end_timeout>

    return f"${greeting}!"


def decode_request(raw_request):
    return ""


# <start_raw>
@my_service.handler()
async def my_handler(ctx: Context):
    try:
        raw_request = ctx.request().body
        decoded_request = decode_request(raw_request)

        # ... rest of your business logic ...

    except TerminalError as err:
        # Propagate to DLQ/catch-all handler
        raise err


# <end_raw>


def make_request():
    pass


@my_service.handler()
async def my_retryable_handler(ctx: Context, greeting: str) -> str:
    # <start_retryable>
    from datetime import timedelta
    from restate.exceptions import RetryableError

    async def call_external_api():
        response = await make_request()
        if response.status == 429:
            retry_after = int(response.headers.get("Retry-After", "30"))
            # Tell Restate to retry after the specified delay
            raise RetryableError(
                "Rate limited",
                retry_after=timedelta(seconds=retry_after),
            )
        return response.data

    result = await ctx.run_typed(
        "call API",
        call_external_api,
        restate.RunOptions(max_attempts=5),
    )
    # <end_retryable>

    return f"${greeting}!"


app = restate.app([my_service])
