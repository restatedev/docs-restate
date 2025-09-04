import restate
from restate import Context
from typing import Dict, Any


class MyInput:
    pass


def process_data(req: MyInput) -> None:
    return None


# <start_here>
async def my_handler(ctx: Context, req: MyInput) -> Dict[str, Any]:
    result = await ctx.run_typed("process", process_data, req=req)
    return {"success": True, "result": result}


# <end_here>
