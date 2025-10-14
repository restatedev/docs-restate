from restate import Context
from restate.exceptions import TerminalError

async def process_order(ctx: Context, order: Order):
    # This executes - not an await point
    ctx.set("status", "processing")

    try:
        # If cancelled before this await, ctx.run won't execute
        # If cancelled during execution, then gets thrown after the execution
        payment = await ctx.run("process-payment", lambda: process_payment(order))

        # These one-way calls execute even if cancellation happened right before
        ctx.send(notification_service.notify, order.user_id, "Payment processed")

    except TerminalError as e:
        # Cancellation detected - run compensation
        await ctx.run("refund-payment", lambda: refund_payment(order))
        raise  # Re-throw to propagate cancellation
