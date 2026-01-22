import restate

my_service = restate.Service("MyService")


@my_service.handler("myHandler")
async def my_handler(ctx: restate.Context, greeting: str) -> str:
    return f"{greeting}!"


app = restate.app([my_service])
