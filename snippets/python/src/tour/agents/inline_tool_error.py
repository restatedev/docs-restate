import httpx
import asyncio

from agents import function_tool


# Without ctx.run - error goes straight to AI
@function_tool
async def my_tool():
    async with httpx.AsyncClient() as client:
        result = await client.get('/api/data')  # Might fail due to network
        # If this fails, AI gets the error immediately
        return result

# With ctx.run - Restate handles retries
@function_tool
async def my_tool_with_restate(ctx):
    async def fetch_data():
        async with httpx.AsyncClient() as client:
            return await client.get('/api/data')

    result = await ctx.run('fetch-data', fetch_data)
    # Network failures get retried automatically
    # Only terminal errors reach the AI
    return result