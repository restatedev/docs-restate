import restate
from datetime import timedelta
from typing import Dict, Any, Optional
from pydantic import BaseModel


class User(BaseModel):
    name: str
    email: str


class OrderDetails(BaseModel):
    id: str
    amount: int


approval_workflow = restate.Workflow("workflow-actions")


@approval_workflow.main()
async def run(ctx: restate.WorkflowContext, user: User) -> Dict[str, bool]:
    order = OrderDetails(id="order123", amount=1500)

    # <start_state>
    # Store intermediate results
    ctx.set("payment-status", "completed")
    ctx.set("order-details", order)
    # <end_state>

    # <start_approval>
    # Wait for external approval
    approval = await ctx.promise("manager-approval")
    # <end_approval>

    # <start_timers>
    # Wait for user action with timeout
    match await restate.select(
        user_response=ctx.promise("user-response").value(),
        timeout=ctx.sleep(timedelta(days=1)),
    ):
        case ["user_response", response]:
            print("Response:", response)
        case _:
            print("Timeout occurred")
    # <end_timers>

    return {"success": True}


# <start_approve>
# External system resolves the promise
@approval_workflow.handler()
async def approve(ctx: restate.WorkflowSharedContext, decision: bool):
    await ctx.promise("manager-approval").resolve(decision)


# <end_approve>

order_workflow = restate.Workflow("order-workflow")


# <start_state_get>
# Query from external handler
@order_workflow.handler()
async def get_order_details(ctx: restate.WorkflowSharedContext) -> OrderDetails:
    return await ctx.get("order-details")


# <end_state_get>
