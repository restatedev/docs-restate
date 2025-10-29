import json
from datetime import timedelta

from restate import Service, Context
from src.develop.my_service import my_handler as my_service_handler
from src.develop.my_virtual_object import my_handler as my_object_handler
from src.develop.my_workflow import run, interact_with_workflow

caller = Service("Caller")


@caller.handler()
async def calling_handler(ctx: Context, arg):
    # <start_request_response>
    # import my_service # Import the service module to get to the handler, not the service itself

    # To call a Service:
    response = await ctx.service_call(my_service_handler, arg="Hi")

    # To call a Virtual Object:
    response = await ctx.object_call(my_object_handler, key="Mary", arg="Hi")

    # To call a Workflow:
    # `run` handler — can only be called once per workflow ID
    response = await ctx.workflow_call(run, key="my_workflow_id", arg="Hi")
    # Other handlers can be called anytime within workflow retention
    response = await ctx.workflow_call(
        interact_with_workflow, key="my_workflow_id", arg="Hi"
    )
    # <end_request_response>

    # <start_request_response_generic>
    response = await ctx.generic_call(
        "MyObject", "my_handler", key="Mary", arg=json.dumps("Hi").encode("utf-8")
    )
    # <end_request_response_generic>

    # <start_one_way>
    # To message a Service:
    ctx.service_send(my_service_handler.my_handler, arg="Hi")

    # To message a Virtual Object:
    ctx.object_send(my_object_handler, key="Mary", arg="Hi")

    # To message a Workflow:
    # `run` handler — can only be called once per workflow ID
    ctx.workflow_send(run, key="my_wf_id", arg="Hi")
    # Other handlers can be called anytime within workflow retention
    ctx.workflow_send(interact_with_workflow, key="my_wf_id", arg="Hi")
    # <end_one_way>

    # <start_one_way_generic>
    ctx.generic_send("MyService", "my_handler", arg=json.dumps("Hi").encode("utf-8"))
    # <end_one_way_generic>

    # <start_delayed>
    # To message a Service with a delay:
    ctx.service_send(my_service_handler, arg="Hi", send_delay=timedelta(hours=5))

    # To message a Virtual Object with a delay:
    ctx.object_send(
        my_object_handler, key="Mary", arg="Hi", send_delay=timedelta(hours=5)
    )

    # To message a Workflow with a delay:
    ctx.workflow_send(
        run, key="my_workflow_id", arg="Hi", send_delay=timedelta(hours=5)
    )
    # <end_delayed>

    # <start_delayed_generic>
    ctx.generic_send(
        "MyService",
        "my_handler",
        arg=json.dumps("Hi").encode("utf-8"),
        send_delay=timedelta(hours=5),
    )
    # <end_delayed_generic>

    # <start_ordering>
    ctx.object_send(my_object_handler, key="Mary", arg="I'm call A")
    ctx.object_send(my_object_handler, key="Mary", arg="I'm call B")
    # <end_ordering>

    # <start_idempotency_key>
    await ctx.service_call(
        my_service_handler,
        arg="Hi",
        idempotency_key="my-idempotency-key",
    )
    # <end_idempotency_key>

    # <start_attach>
    # Send a request, get the invocation id
    handle = ctx.service_send(
        my_service_handler, arg="Hi", idempotency_key="my-idempotency-key"
    )
    invocation_id = await handle.invocation_id()

    # Now re-attach
    result = await ctx.attach_invocation(invocation_id, type_hint=str)
    # <end_attach>

    # <start_cancel>
    ctx.cancel_invocation(invocation_id)
    # <end_cancel>
