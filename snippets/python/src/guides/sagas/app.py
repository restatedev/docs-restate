import logging
from .clients.payment import charge, refund

import restate
from pydantic import BaseModel

from src.guides.sagas.clients import payment, flight_client

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(process)d] [%(levelname)s] - %(message)s",
)


class BookingRequest(BaseModel):
    customer_id: str
    flight: flight_client.FlightRequest
    payment_info: str


booking_workflow = restate.Service("BookingWorkflow")


@booking_workflow.handler()
async def run(ctx: restate.Context, req: BookingRequest):
    payment_info = req.payment_info
    customer_id = req.customer_id
    flight = req.flight

    # Create a list of undo actions
    compensations = []

    # <start_twostep>
    booking_id = await ctx.run_typed(
        "reserve", flight_client.reserve, customer_id=customer_id, flight=flight
    )
    compensations.append(
        lambda: ctx.run_typed("cancel", flight_client.cancel, booking_id=booking_id)
    )

    #  ... do other work, like reserving a car, etc. ...

    await ctx.run_typed("confirm", flight_client.confirm, booking_id=booking_id)
    # <end_twostep>

    # <start_idempotency>
    payment_id = str(ctx.uuid())
    compensations.append(lambda: ctx.run_typed("refund", refund, payment_id=payment_id))
    await ctx.run_typed("charge", charge, payment_info=payment_info, payment_id=payment_id)
    # <end_idempotency>


app = restate.app([booking_workflow])

if __name__ == "__main__":
    import hypercorn
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
