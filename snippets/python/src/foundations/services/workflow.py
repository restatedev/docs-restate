import restate
from pydantic import BaseModel
from restate import WorkflowContext, WorkflowSharedContext
from typing import Dict
import uuid


class User(BaseModel):
    name: str
    email: str


def create_user_entry(user_id: str, user: User) -> None:
    return None


def send_verification_email(user: User, secret: str) -> None:
    return None


# <start_here>
signup_workflow = restate.Workflow("UserSignup")


@signup_workflow.main()
async def run(ctx: WorkflowContext, user: User) -> bool:
    # workflow ID = user ID; workflow runs once per user
    user_id = ctx.key()

    await ctx.run_typed("create", create_user_entry, user_id=user_id, user=user)

    secret = str(ctx.uuid())
    await ctx.run_typed("mail", send_verification_email, user=user, secret=secret)

    click_secret = await ctx.promise("email-link-clicked", type_hint=str).value()
    return click_secret == secret


@signup_workflow.handler()
async def click(ctx: WorkflowSharedContext, secret: str) -> None:
    await ctx.promise("email-link-clicked", type_hint=str).resolve(secret)


# <end_here>
