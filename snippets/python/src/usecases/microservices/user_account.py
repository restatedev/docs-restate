import restate
from restate import TerminalError

# <start_here>
user_account = restate.VirtualObject("UserAccount")


@user_account.handler()
async def update_balance(ctx: restate.ObjectContext, amount: float):
    balance = await ctx.get("balance") or 0.0
    new_balance = balance + amount

    if new_balance < 0.0:
        raise TerminalError("Insufficient funds")

    ctx.set("balance", new_balance)
    return new_balance


@user_account.handler(kind="shared")
async def get_balance(ctx: restate.ObjectSharedContext):
    return await ctx.get("balance") or 0.0


# <end_here>
