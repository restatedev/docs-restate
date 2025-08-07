import restate
from restate import Context, Service

my_service = Service("MyService")


@my_service.handler("myHandler")
async def my_handler(ctx: Context:
    # <start_headers>
    ctx.request().headers
    # <end_headers>