import restate

my_object = restate.VirtualObject("MyVirtualObject")


@my_object.handler("myHandler")
async def my_handler(ctx: restate.ObjectContext, greeting: str) -> str:
    return f"{greeting} {ctx.key()}!"


@my_object.handler(kind="shared")
async def my_concurrent_handler(ctx: restate.ObjectSharedContext, greeting: str) -> str:
    return f"{greeting} {ctx.key()}!"


app = restate.app([my_object])
