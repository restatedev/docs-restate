import restate
from pydantic import BaseModel
from restate import Context
from typing import Dict, Any


class MyInput:
    pass

class ProcessingResult(BaseModel):
    success: bool
    result: Any

def process_data(req: MyInput) -> ProcessingResult:
    return ProcessingResult(success=True, result="result")


# <start_here>
async def my_handler(ctx: Context, req: MyInput) -> ProcessingResult:
    return await ctx.run_typed("process", process_data, req=req)


# <end_here>
