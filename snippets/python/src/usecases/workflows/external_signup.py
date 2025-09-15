import restate
from typing import Dict, Any
from pydantic import BaseModel


class User(BaseModel):
    name: str
    email: str


class CreateUserRequest(BaseModel):
    user_id: str
    user: User


def activate_user(user_id: str):
    # Simulate user activation
    pass


def send_welcome_email(user: User):
    # Simulate sending welcome email
    pass


user_service = restate.Service("user-service")


@user_service.handler()
async def create_user(ctx: restate.Context, req: CreateUserRequest) -> bool:
    # Simulate DB call
    print(f"Creating user {req.user_id}")
    return True


user_signup = restate.Workflow("user-signup")


@user_signup.main()
async def run(ctx: restate.WorkflowContext, user: User) -> Dict[str, bool]:
    user_id = ctx.key()

    # <start_here>
    # Move user DB interaction to dedicated service
    success = await ctx.service_call(
        create_user, CreateUserRequest(user_id=user_id, user=user)
    )
    if not success:
        return {"success": False}

    # Execute other steps inline
    await ctx.run_typed("activate", activate_user, user_id=user_id)
    await ctx.run_typed("welcome", send_welcome_email, user=user)
    # <end_here>

    return {"success": True}
