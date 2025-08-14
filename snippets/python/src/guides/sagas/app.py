import logging
import uuid

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
    booking_id = await ctx.run(
        "reserve", flight_client.reserve, args=(customer_id, flight)
    )
    compensations.append(
        lambda: ctx.run("cancel", flight_client.cancel, args=(booking_id,))
    )

    #  ... do other work, like reserving a car, etc. ...

    await ctx.run("confirm", flight_client.confirm, args=(booking_id,))
    # <end_twostep>

    # <start_idempotency>
    payment_id = await ctx.run("payment id", lambda: str(uuid.uuid4()))
    compensations.append(lambda: ctx.run("refund", payment.refund, args=(payment_id,)))
    await ctx.run("charge", payment.charge, args=(payment_info, payment_id))
    # <end_idempotency>


app = restate.app([booking_workflow])

if __name__ == "__main__":
    import hypercorn
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
