# Demo app for the signals docs examples — run against a local Restate server:
#   uv run hypercorn --bind localhost:9082 src/develop/signals_demo_app:app
from datetime import timedelta

import restate
from pydantic import BaseModel


class SteerRequest(BaseModel):
    invocation_id: str
    text: str


class ApproveRequest(BaseModel):
    invocation_id: str
    approved: bool


coordination_service = restate.Service("SignalsTestPy")


@coordination_service.handler()
async def wait_for_approval(ctx: restate.Context) -> bool:
    # <start_one_shot>
    approved = await ctx.signal("approval", type_hint=bool)
    # <end_one_shot>
    return approved


# <start_wait>
@coordination_service.handler()
async def revise_until_done(ctx: restate.Context, topic: str) -> str:
    draft = f"Research notes for {topic}"
    while True:
        text = await ctx.signal("steer", type_hint=str)
        if text == "done":
            return draft
        draft = f"{draft}\n{text}"
# <end_wait>


@coordination_service.handler()
async def sleep_then_wait(ctx: restate.Context) -> str:
    await ctx.sleep(timedelta(seconds=3))
    return await ctx.signal("steer", type_hint=str)


@coordination_service.handler()
async def steer_invocation(ctx: restate.Context, req: SteerRequest) -> None:
    # <start_resolve>
    ctx.resolve_signal(req.invocation_id, "steer", req.text)
    # <end_resolve>


@coordination_service.handler()
async def approve(ctx: restate.Context, req: ApproveRequest) -> None:
    ctx.resolve_signal(req.invocation_id, "approval", req.approved)


@coordination_service.handler()
async def deny(ctx: restate.Context, req: SteerRequest) -> None:
    ctx.reject_signal(req.invocation_id, "approval", "Request denied")

