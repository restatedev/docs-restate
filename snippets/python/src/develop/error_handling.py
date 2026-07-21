from datetime import timedelta

import restate
from restate import Service, Context

my_service = Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, arg):
    # <start_terminal>
    from restate.exceptions import TerminalError

    raise TerminalError(
        "Payment declined.",
        status_code=402,
        metadata={
            "reason": "insufficient_funds",
            "payment_id": "payment-123",
        },
    )
    # <end_terminal>


from restate.exceptions import TerminalError

billing_service = Service("BillingService")


@billing_service.handler()
async def charge(ctx: Context, payment_id: str):
    raise TerminalError(
        "Payment declined.",
        status_code=402,
        metadata={"reason": "insufficient_funds", "payment_id": payment_id},
    )


# <start_terminal_metadata_caller>
async def checkout(ctx: Context, payment_id: str):
    try:
        await ctx.service_call(charge, arg=payment_id)
        return {"status": "charged"}
    except TerminalError as err:
        return {
            "status": "declined",
            "code": err.status_code,
            "reason": err.metadata.get("reason") if err.metadata else None,
        }


# <end_terminal_metadata_caller>


def undo_transaction():
    pass


@my_service.handler()
async def my_handler_2(ctx: Context, arg):
    # <start_run>
    try:
        # Await a ctx.run_typed raising an error
        def do_transaction():
            raise TerminalError("Can't write")

        await ctx.run_typed("do transaction", do_transaction)
    except TerminalError as err:
        # Handle the terminal error raised by ctx.run_typed
        # For example, undo previous actions...
        await ctx.run_typed("undo transaction", undo_transaction)
        # ...and propagate the error
        raise err
    # <end_run>


def make_request():
    pass


@my_service.handler()
async def my_handler_3(ctx: Context, arg):
    # <start_retryable>
    from datetime import timedelta
    from restate.exceptions import RetryableError

    raise RetryableError(
        "Service temporarily unavailable",
        retry_after=timedelta(seconds=30),
    )
    # <end_retryable>


@my_service.handler()
async def my_handler_4(ctx: Context, arg):
    # <start_retryable_run>
    from datetime import timedelta
    from restate.exceptions import RetryableError

    async def call_external_api():
        response = await make_request()
        if response.status == 429:
            retry_after = int(response.headers.get("Retry-After", "30"))
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
    # <end_retryable_run>
