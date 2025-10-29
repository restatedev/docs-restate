import restate
from restate.exceptions import TerminalError
def process_payment(id, order):
    pass


def refund_payment(id):
    pass

order_service = restate.VirtualObject("order-service")

class Order:
    pass

@order_service.handler()
async def notify(ctx: restate.ObjectContext, message: str):
    pass

# <start_here>
@order_service.handler()
async def process_order(ctx: restate.ObjectContext, order: Order):
    # If cancellation happened before this line, this still executes
    ctx.set("status", "processing")

    # If cancellation happened before this line, this still executes
    payment_id = str(ctx.uuid())
    try:
        # If cancelled before this await, ctx.run won't execute
        # If cancelled during run block execution,
        # then a terminal error gets raised here once execution finishes
        await ctx.run_typed("process-payment", process_payment, id=payment_id, order=order)

        # If cancellation happened before this line, this still executes
        ctx.service_send(notify, "Payment processed")

    except TerminalError as e:
        # Cancellation detected - run compensation
        await ctx.run_typed("refund-payment", refund_payment, id=payment_id)
        raise e # Re-throw to propagate cancellation
# <end_here>
