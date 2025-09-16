from datetime import timedelta

import restate

# <start_options>
# Specify service options when you create them
my_workflow = restate.Workflow(
    "MyWorkflow",
    inactivity_timeout=timedelta(minutes=15),
    abort_timeout=timedelta(minutes=15),
    idempotency_retention=timedelta(days=3),
    journal_retention=timedelta(days=7),
    ingress_private=True,
    enable_lazy_state=True,  # only for Objects/Workflows
    invocation_retry_policy=restate.InvocationRetryPolicy(
        initial_interval=timedelta(seconds=1),
        max_interval=timedelta(seconds=30),
        max_attempts=10,
        on_max_attempts="pause"
    )
)
# <end_options>


# <start_handleropts>
# Specify handler options via the decorator
@my_workflow.main(
    inactivity_timeout=timedelta(minutes=15),
    abort_timeout=timedelta(minutes=15),
    workflow_retention=timedelta(days=3),
    # -> or idempotency_retention for Services/Objects
    journal_retention=timedelta(days=7),
    ingress_private=True,
    enable_lazy_state=True,  # only for Objects/Workflows
    invocation_retry_policy=restate.InvocationRetryPolicy(
        initial_interval=timedelta(seconds=1),
        max_interval=timedelta(seconds=30),
        max_attempts=10,
        on_max_attempts="pause"
    )
)
async def run(ctx: restate.WorkflowContext, req: str) -> str:
    # ... implement workflow logic here ---
    return "success"


#  <end_handleropts>


app = restate.app([my_workflow])

if __name__ == "__main__":
    import hypercorn
    import hypercorn.asyncio
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
