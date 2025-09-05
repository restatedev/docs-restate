import restate
from pydantic import BaseModel
from restate import WorkflowContext, WorkflowSharedContext

order_workflow = restate.Workflow("OrderWorkflow")


class Order(BaseModel):
    pass


@order_workflow.main()
async def run(ctx: WorkflowContext, order: Order) -> None:
    pass


@order_workflow.handler()
async def get_status(ctx: WorkflowSharedContext) -> str:
    return "pending"
