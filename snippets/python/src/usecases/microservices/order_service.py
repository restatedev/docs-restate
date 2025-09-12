import restate
from typing import List, Dict, Any
import uuid

from pydantic import BaseModel


class Item(BaseModel):
    id: str
    amount: int


class Order(BaseModel):
    id: str
    items: List[Item]
    credit_card: str


def charge_payment(credit_card: str, payment_id: str):
    # Simulate payment processing
    pass


def reserve(item_id: str, amount: int):
    # Simulate inventory reservation
    pass


# <start_here>
order_service = restate.Service("OrderService")


@order_service.handler()
async def process(ctx: restate.Context, order: Order):
    # Each step is automatically durable and resumable
    payment_id = str(uuid.uuid4())

    await ctx.run_typed(
        "charge", charge_payment, credit_card=order.credit_card, payment_id=payment_id
    )

    for item in order.items:
        await ctx.run_typed(
            f"reserve_{item.id}", reserve, item_id=item.id, amount=item.amount
        )

    return {"success": True, "payment_id": payment_id}


# <end_here>
