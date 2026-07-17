# <start_here>
import asyncio

import restate

from ..my_service import my_handler as my_service_handler
from ..my_service import my_service
from ..my_virtual_object import my_handler as my_object_handler
from ..my_virtual_object import my_object

app = restate.app([my_service, my_object])


async def test_handlers() -> None:
    async with restate.create_test_harness(app, always_replay=True) as env:
        # Invoke a Service handler with the typed ingress client
        response = await env.client.service_call(my_service_handler, arg="Hello")
        assert response == "Hello!"

        # Invoke a Virtual Object handler
        response = await env.client.object_call(
            my_object_handler, key="myKey", arg="Hello"
        )
        assert response == "Hello myKey!"


if __name__ == "__main__":
    asyncio.run(test_handlers())
# <end_here>
