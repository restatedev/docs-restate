from datetime import timedelta

from restate import Service, Context

my_service = Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, arg):
    # <start_terminal>
    from restate.exceptions import TerminalError

    raise TerminalError("Something went wrong.")
    # <end_terminal>

from restate.exceptions import TerminalError

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
        # Handle the terminal error raised within ctx.run_typed
        # For example, undo previous actions...
        await ctx.run_typed("undo transaction", undo_transaction)
        # ...and propagate the error
        raise err
    # <end_run>
