import restate
from restate import WorkflowContext

signup_workflow = restate.Workflow("SignupWorkflow")


@signup_workflow.main()
async def run(ctx: WorkflowContext) -> bool:
    return True


# <start_here>
handler = restate.app(services=[signup_workflow])
# <end_here>
