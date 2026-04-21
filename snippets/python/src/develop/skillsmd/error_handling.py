import restate

error_handling_service = restate.Service("MyService")


@error_handling_service.handler()
async def my_handler(ctx: restate.Context, greeting: str) -> str:
    # <start_terminal>
    from restate import TerminalError

    raise TerminalError("Invalid input - will not retry")
    # <end_terminal>

    # <start_catch>
    # Bad: bare except swallows Restate's internal suspension signals
    try:
        result = await ctx.run("api-call", call_external_api)
    except:
        result = None

    # Good: catch the specific exception you expect
    try:
        result = await ctx.run("api-call", call_external_api)
    except TimeoutError as e:
        raise TerminalError(f"API timeout: {e}")
    # <end_catch>
