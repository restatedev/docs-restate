import restate
from pydantic import BaseModel
from restate import ObjectContext

class UserProfile(BaseModel):
    name: str
    email: str

user_account = restate.VirtualObject("UserAccount")


@user_account.handler()
async def get_profile(ctx: ObjectContext) -> UserProfile:
    return UserProfile(name="John", email="john@example.com")