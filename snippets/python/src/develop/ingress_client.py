from datetime import timedelta

import restate

from src.develop.my_service import my_handler as my_service_handler
from src.develop.my_virtual_object import my_handler as my_object_handler
from src.develop.my_workflow import interact_with_workflow, run


async def request_response() -> None:
    # <start_request_response>
    async with restate.create_client("http://localhost:8080") as client:
        # Call a service
        service_response = await client.service_call(my_service_handler, arg="Hi")

        # Call a Virtual Object
        object_response = await client.object_call(
            my_object_handler, key="Mary", arg="Hi"
        )

        # Start a Workflow
        workflow_response = await client.workflow_call(
            run, key="my_workflow_id", arg="Hi"
        )

        # Call another Workflow handler
        workflow_status = await client.workflow_call(
            interact_with_workflow, key="my_workflow_id", arg="Hi"
        )
    # <end_request_response>


async def one_way() -> None:
    # <start_one_way>
    async with restate.create_client("http://localhost:8080") as client:
        # Send a message to a service
        await client.service_send(my_service_handler, arg="Hi")

        # Send a message to a Virtual Object
        await client.object_send(my_object_handler, key="Mary", arg="Hi")

        # Start a Workflow without waiting for the result
        await client.workflow_send(run, key="my_workflow_id", arg="Hi")
    # <end_one_way>


async def delayed() -> None:
    # <start_delayed>
    async with restate.create_client("http://localhost:8080") as client:
        # Send a delayed message to a service
        await client.service_send(
            my_service_handler, arg="Hi", send_delay=timedelta(hours=5)
        )

        # Send a delayed message to a Virtual Object
        await client.object_send(
            my_object_handler,
            key="Mary",
            arg="Hi",
            send_delay=timedelta(hours=5),
        )

        # Start a Workflow after a delay
        await client.workflow_send(
            run,
            key="my_workflow_id",
            arg="Hi",
            send_delay=timedelta(hours=5),
        )
    # <end_delayed>


async def idempotent() -> None:
    # <start_idempotent>
    async with restate.create_client("http://localhost:8080") as client:
        response = await client.service_call(
            my_service_handler,
            arg="Hi",
            idempotency_key="abcde",
        )
    # <end_idempotent>


async def flow_control() -> None:
    # <start_scope>
    async with restate.create_client("http://localhost:8080") as client:
        scoped_client = client.scope("tenant-123")

        # Route a call into a named scope
        service_response = await scoped_client.service_call(
            my_service_handler, arg="Hi"
        )

        # Add a limit key for a hierarchical concurrency limit
        workflow_response = await scoped_client.workflow_call(
            run,
            key="my_workflow_id",
            arg="Hi",
            limit_key="premium/user42",
        )

        # Fire and forget sends can be scoped too
        await scoped_client.service_send(my_service_handler, arg="Hi")
    # <end_scope>
