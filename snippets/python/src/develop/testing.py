# <start_service>
import restate

greeter = restate.Service("greeter")


@greeter.handler()
async def greet(ctx: restate.Context, name: str) -> str:
    return f"Hello {name}!"


app = restate.app(services=[greeter])
# <end_service>


# <start_testing>
import asyncio

import restate


async def test_greet() -> None:
    async with restate.create_test_harness(app, always_replay=True) as env:
        result = await env.client.service_call(greet, arg="Alice")
        assert result == "Hello Alice!"


if __name__ == "__main__":
    asyncio.run(test_greet())
# <end_testing>
