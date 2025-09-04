from datetime import timedelta

import restate
from requests import options
from restate import Context, Service
from restate.exceptions import TerminalError
import uuid
from typing import TypedDict, List, Optional

my_service = Service("MyService")

class SubscriptionRequest(TypedDict):
    userId: str
    creditCard: str
    subscriptions: List[str]

def create_recurring_payment(credit_card: str, payment_id: str) -> str:
    """Mock function to create recurring payment"""
    return f"payRef-{uuid.uuid4()}"



@my_service.handler("myHandler")
async def my_service_handler(ctx: Context, req: SubscriptionRequest) :
    payment_id = f"payment-{uuid.uuid4()}"
    # <start_here>
    retry_opts = restate.RunOptions(
        max_attempts=10, max_retry_duration=timedelta(seconds=30)
    )
    pay_ref = await ctx.run_typed(
        "pay", lambda: create_recurring_payment(req["creditCard"], payment_id), retry_opts
    )
    # <end_here>



app = restate.app([my_service])
