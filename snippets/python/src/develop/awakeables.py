from datetime import timedelta

from restate import Service, Context

my_service = Service("MyService")


@my_service.handler()
async def my_handler(ctx: Context, arg):
    name = "Pete"

    # <start_here>
    id, promise = ctx.awakeable(type_hint=str)

    await ctx.run_typed("trigger task", request_human_review, name=name, id=id)

    review = await promise
    # <end_here>

    # <start_resolve>
    ctx.resolve_awakeable(name, review)
    # <end_resolve>

    # <start_reject>
    ctx.reject_awakeable(name, "Cannot be reviewed")
    # <end_reject>

    return arg


def request_human_review(name, id):
    return "123"
