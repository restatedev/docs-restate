from typing import List, Optional

import restate
from pydantic import BaseModel
from restate.exceptions import TerminalError


class Location(BaseModel):
    location: str
    timestamp: str


class Delivery(BaseModel):
    final_destination: str
    locations: List[Location] = []


# <start_here>
delivery_tracker = restate.VirtualObject("DeliveryTracker")


@delivery_tracker.handler()
async def register(ctx: restate.ObjectContext, delivery: Delivery):
    ctx.set("delivery", delivery)


@delivery_tracker.handler()
async def set_location(ctx: restate.ObjectContext, location: Location):
    delivery = await ctx.get("delivery", type_hint=Delivery)
    if delivery is None:
        raise TerminalError(f"Delivery {ctx.key()} not found")

    delivery.locations.append(location)
    ctx.set("delivery", delivery)


@delivery_tracker.handler(kind="shared")
async def get_delivery(ctx: restate.ObjectSharedContext) -> Delivery:
    delivery = await ctx.get("delivery", type_hint=Delivery)
    if delivery is None:
        raise TerminalError(f"Delivery {ctx.key()} not found")
    return delivery


# <end_here>

app = restate.app([delivery_tracker])

if __name__ == "__main__":
    import hypercorn
    import hypercorn.asyncio
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
