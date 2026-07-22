import restate


# <start_one_shot>
async def wait_for_approval(ctx: restate.Context) -> bool:
    approved = await ctx.signal("approval", type_hint=bool)
    return approved


# <end_one_shot>


# <start_wait>
async def revise_until_done(ctx: restate.Context, topic: str) -> str:
    draft = f"Research notes for {topic}"

    while True:
        # Each call waits for the next resolution of the named signal.
        text = await ctx.signal("steer", type_hint=str)
        if text == "done":
            return draft
        draft = f"{draft}\n{text}"


# <end_wait>


# <start_resolve>
def steer_invocation(
    ctx: restate.Context, invocation_id: str, text: str
) -> None:
    ctx.resolve_signal(invocation_id, "steer", text)


# <end_resolve>
