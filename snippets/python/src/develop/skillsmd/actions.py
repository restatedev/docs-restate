import asyncio
import json

import restate
from datetime import timedelta
from pydantic import BaseModel

# Service stubs for examples
my_service = restate.Service("MyService")
my_object = restate.VirtualObject("MyObject")
my_workflow = restate.Workflow("MyWorkflow")
claude_service = restate.Service("ClaudeService")
openai_service = restate.Service("OpenAIService")


def call_external_api(query: str, some_id: str):
    pass


def request_human_review(name, awakeable_id):
    pass


@claude_service.handler()
async def ask_claude(ctx: restate.Context, prompt: str) -> str:
    return "Claude response"


@openai_service.handler()
async def ask_openai(ctx: restate.Context, prompt: str) -> str:
    return "OpenAI response"


@my_object.handler()
async def my_object_handler(ctx: restate.ObjectContext, prompt: str) -> str:
    return "done"


@my_service.handler()
async def my_handler(ctx: restate.ObjectContext, prompt: str) -> str:
    return prompt


@my_workflow.main()
async def run(ctx: restate.WorkflowContext, arg: str) -> str:
    # <start_state>
    count = await ctx.get("count", type_hint=int) or 0
    ctx.set("count", count + 1)
    ctx.clear("count")
    ctx.clear_all()
    keys = ctx.state_keys()
    # <end_state>

    # <start_deterministic_helpers>
    my_uuid = ctx.uuid()
    ctx.random().random()
    current_time = await ctx.time()
    # <end_deterministic_helpers>

    # <start_service_calls>
    response = await ctx.service_call(my_handler, "Hi")
    response2 = await ctx.object_call(my_object_handler, key="object-key", arg="Hi")
    response3 = await ctx.workflow_call(run, "wf-id", arg="Hi")
    # <end_service_calls>

    # <start_sending_messages>
    ctx.service_send(my_handler, "Hi")
    ctx.object_send(my_object_handler, key="object-key", arg="Hi")
    ctx.workflow_send(run, "wf-id", arg="Hi")
    # <end_sending_messages>

    # <start_request_response_generic>
    response_bytes = await ctx.generic_call(
        "MyObject", "my_handler", key="Mary", arg=json.dumps("Hi").encode("utf-8")
    )
    # <end_request_response_generic>

    # <start_delayed_messages>
    ctx.service_send(my_handler, "Hi", send_delay=timedelta(hours=5))
    # <end_delayed_messages>

    # <start_durable_steps>
    # Wrap non-deterministic code in ctx.run
    result = await ctx.run(
        "my-side-effect", lambda: call_external_api("weather", "123")
    )

    # Or with typed version for better type safety
    result = await ctx.run_typed(
        "my-side-effect", call_external_api, query="weather", some_id="123"
    )
    # <end_durable_steps>

    # <start_durable_timers>
    # Sleep
    await ctx.sleep(timedelta(seconds=30))

    # Schedule delayed call (different from sleep + send)
    ctx.service_send(my_handler, "Hi", send_delay=timedelta(hours=5))
    # <end_durable_timers>

    name = "Pete"
    # <start_awakeables>
    # Create awakeable
    awakeable_id, promise = ctx.awakeable(type_hint=str)

    # Send ID to external system
    await ctx.run_typed(
        "request_human_review",
        request_human_review,
        name=name,
        awakeable_id=awakeable_id,
    )

    # Wait for result
    review = await promise
    # <end_awakeables>

    # <start_awakeables_resolution>
    ctx.resolve_awakeable(awakeable_id, "Looks good!")
    ctx.reject_awakeable(awakeable_id, "Cannot be reviewed")
    # <end_awakeables_resolution>

    # <start_workflow_promises>
    # Wait for promise
    review = await ctx.promise("review", type_hint=str).value()

    # Resolve promise
    await ctx.promise("review", type_hint=str).resolve("approval")
    # <end_workflow_promises>

    call1 = ctx.run_typed(
        "LLM call", call_llm, prompt="What is the weather?", model="gpt-4"
    )
    call2 = ctx.run_typed(
        "LLM call", call_llm, prompt="What is the weather?", model="gpt-3.5-turbo"
    )

    # <start_gather>
    # ❌ BAD
    results1 = await asyncio.gather(call1, call2)

    # ✅ GOOD
    claude_call = ctx.service_call(ask_openai, "What is the weather?")
    openai_call = ctx.service_call(ask_claude, "What is the weather?")
    results2 = await restate.gather(claude_call, openai_call)
    # <end_gather>

    # <start_select>
    # ❌ BAD
    result1 = await asyncio.wait([call1, call2], return_when=asyncio.FIRST_COMPLETED)  # type: ignore[type-var]

    # ✅ GOOD
    confirmation = ctx.awakeable(type_hint=str)
    match await restate.select(
        confirmation=confirmation[1], timeout=ctx.sleep(timedelta(days=1))
    ):
        case ["confirmation", result]:
            print("Got confirmation:", result)
        case ["timeout", _]:
            raise restate.TerminalError("Timeout!")
    # <end_select>

    # <start_wait_completed>
    done, pending = await restate.wait_completed(call1, call2)
    results = [await f for f in done]
    # Cancel pending if needed
    # <end_wait_completed>

    # <start_as_completed>
    async for future in restate.as_completed(call1, call2):
        print(await future)
    # <end_as_completed>

    # <start_idempotency>
    # Send a request, get the invocation id
    handle = ctx.service_send(
        my_handler, arg="Hi", idempotency_key="my-idempotency-key"
    )
    # <end_idempotency>

    # <start_attach>
    invocation_id = await handle.invocation_id()
    result = await ctx.attach_invocation(invocation_id)
    # <end_attach>

    # <start_cancel>
    ctx.cancel_invocation(invocation_id)
    # <end_cancel>

    # <start_catch>
    # BAD - catches Restate internals, causes silent failures
    try:
        result = await ctx.service_call(some_handler, arg="Hi")
    except Exception:
        pass

    # GOOD - catch only specific exceptions
    try:
        result = await ctx.service_call(some_handler, arg="Hi")
    except restate.TerminalError as e:
        raise e
    # <end_catch>

    return "done"


@my_service.handler()
async def some_handler(ctx: restate.Context, arg: str) -> str:
    return "done"


async def call_llm(prompt: str, model: str) -> str:
    return "done"
