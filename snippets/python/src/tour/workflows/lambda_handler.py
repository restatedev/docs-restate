import restate
from restate import WorkflowContext
from app.utils import User, create_user, activate_user, send_welcome_email

signup_workflow = restate.Workflow("SignupWorkflow")


@signup_workflow.main()
async def run(ctx: WorkflowContext, user: User) -> bool:
    return True


# <start_here>
handler = restate.app(services=[signup_workflow])
# <end_here>
