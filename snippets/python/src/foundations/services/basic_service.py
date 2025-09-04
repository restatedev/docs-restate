import restate
from pydantic import BaseModel
from restate import Context
from typing import Dict, List, Any
import uuid


class SubscriptionRequest(BaseModel):
    user_id: str
    credit_card: str
    subscriptions: List[str]


def create_recurring_payment(credit_card: str, payment_id: str) -> None:
    return None


def create_subscription(user_id: str, subscription: str, pay_ref: Any) -> None:
    return None


# <start_here>
subscription_service = restate.Service("SubscriptionService")


@subscription_service.handler()
async def add(ctx: Context, req: SubscriptionRequest) -> None:
    payment_id = str(uuid.uuid4())

    pay_ref = await ctx.run_typed(
        "pay",
        create_recurring_payment,
        credit_card=req.credit_card,
        payment_id=payment_id,
    )

    for subscription in req.subscriptions:
        await ctx.run_typed(
            "add-" + subscription,
            create_subscription,
            user_id=req.user_id,
            subscription=subscription,
            pay_ref=pay_ref,
        )


# <end_here>
