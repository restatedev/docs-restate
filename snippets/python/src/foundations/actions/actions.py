import restate
from restate import Context, ObjectContext, WorkflowContext, WorkflowSharedContext
import json
import uuid
import asyncio
from datetime import timedelta
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

from src.foundations.actions.user_account import UserProfile


# Type definitions for examples


class ShoppingCart(BaseModel):
    pass


class PaymentResult(BaseModel):
    success: bool
    transaction_id: str


class InventoryConfirmation(BaseModel):
    available: bool
    quantity: int


# Mock external functions
async def fetch_url(url: str) -> Dict:
    return {}


async def update_user_database(id: str, data: Any) -> Any:
    return data


# Example service that demonstrates all actions
actions_example_service = restate.Service("ActionsExample")


@actions_example_service.handler()
async def durable_steps_example(ctx: Context, user_id: str) -> None:
    # <start_durable_steps>
    # External API call
    api_result = await ctx.run_typed(
        "fetch-data", fetch_url, url="https://api.example.com/data"
    )

    # Database operation
    db_result = await ctx.run_typed(
        "update-user", update_user_database, id=user_id, data={"name": "John"}
    )

    # Idempotency key generation
    id = ctx.uuid()
    # <end_durable_steps>


@actions_example_service.handler()
async def service_calls_example(ctx: Context, req: Dict[str, Any]) -> None:
    user_id = req["userId"]
    order_id = req["orderId"]
    order = req["order"]

    # <start_service_calls>
    # Call another service
    from validation_service import validate_order

    validation = await ctx.service_call(validate_order, order)

    # Call Virtual Object function
    from user_account import get_profile

    profile = await ctx.object_call(get_profile, key=user_id, arg=None)

    # Submit Workflow
    from order_workflow import run

    result = await ctx.workflow_call(run, key=order_id, arg=order)
    # <end_service_calls>


@actions_example_service.handler()
async def sending_messages_example(ctx: Context, user_id: str) -> None:
    # <start_sending_messages>
    # Fire-and-forget notification
    from notification_service import send_email

    ctx.service_send(send_email, {"userId": user_id, "message": "Welcome!"})

    # Background analytics
    from analytics_service import record_event

    ctx.service_send(record_event, {"kind": "user_signup", "userId": user_id})

    # Cleanup task
    from shopping_cart_object import empty_expired_cart

    ctx.object_send(empty_expired_cart, key=user_id, arg=None)
    # <end_sending_messages>


@actions_example_service.handler()
async def delayed_messages_example(ctx: Context, req: Dict[str, str]) -> None:
    user_id = req["userId"]
    message = req["message"]

    # <start_delayed_messages>
    # Schedule reminder for tomorrow
    from notification_service import send_reminder

    ctx.service_send(
        send_reminder,
        {"userId": user_id, "message": message},
        send_delay=timedelta(days=1),
    )
    # <end_delayed_messages>


@actions_example_service.handler()
async def durable_timers_example(ctx: Context, req: Dict[str, Any]) -> None:
    order_id = req["orderId"]
    order = req["order"]

    # <start_durable_timers>
    # Sleep for specific duration
    await ctx.sleep(timedelta(minutes=5))  # 5 minutes

    # Wait for action or timeout
    from order_workflow import run

    match await restate.select(
        result=ctx.workflow_call(run, key=order_id, arg=order),
        timeout=ctx.sleep(timedelta(minutes=5)),
    ):
        case ["result", result]:
            return result
        case _:
            print("Order processing timed out")

    # <end_durable_timers>
    return None


# Example Virtual Object that demonstrates state actions
state_example_object = restate.VirtualObject("StateExample")


@state_example_object.handler()
async def state_get_example(ctx: ObjectContext) -> None:
    # <start_state_get>
    # Get with type and default value
    profile = await ctx.get("profile", type_hint=UserProfile)
    count = await ctx.get("count", type_hint=int) or 0
    cart = await ctx.get("cart", type_hint=ShoppingCart) or ShoppingCart()
    # <end_state_get>


@state_example_object.handler()
async def state_set_example(ctx: ObjectContext, count: int) -> None:
    # <start_state_set>
    # Store simple values
    ctx.set("lastLogin", ctx.request().headers.get("date"))
    ctx.set("count", count + 1)

    # Store complex objects
    ctx.set("profile", UserProfile(name="John Doe", email="john@example.com"))
    # <end_state_set>


@state_example_object.handler()
async def state_clear_example(ctx: ObjectContext) -> None:
    # <start_state_clear>
    # Clear specific keys
    ctx.clear("shoppingCart")
    ctx.clear("sessionToken")

    # Clear all user data
    ctx.clear_all()
    # <end_state_clear>


# Example Workflow that demonstrates workflow actions
workflow_example_workflow = restate.Workflow("WorkflowExample")


@workflow_example_workflow.main()
async def run(ctx: WorkflowContext) -> None:
    # <start_workflow_promises>
    # Wait for external event
    payment_result = await ctx.promise(
        "payment-completed", type_hint=PaymentResult
    ).value()

    # Wait for human approval
    approved = await ctx.promise("manager-approval", type_hint=bool).value()

    # Wait for multiple events using gather
    payment_promise = ctx.promise("payment", type_hint=PaymentResult)
    inventory_promise = ctx.promise("inventory", type_hint=InventoryConfirmation)
    payment, inventory = await restate.gather(
        payment_promise.value(), inventory_promise.value()
    )
    # <end_workflow_promises>


# <start_signal_functions>
# In a signal function
@workflow_example_workflow.handler()
async def confirm_payment(ctx: WorkflowSharedContext, result: PaymentResult) -> None:
    await ctx.promise("payment-completed").resolve(result)


# In a signal function
@workflow_example_workflow.handler()
async def approve_request(ctx: WorkflowSharedContext, approved: bool) -> None:
    await ctx.promise("manager-approval").resolve(approved)


# <end_signal_functions>
