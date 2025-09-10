from datetime import timedelta

import restate

# <start_options>
my_workflow = restate.Workflow(
    "MyWorkflow",
    inactivity_timeout=timedelta(minutes=15),
    abort_timeout=timedelta(minutes=15),
    idempotency_retention=timedelta(days=3),
    journal_retention=timedelta(days=7),
    ingress_private=True,
    enable_lazy_state=True, # only for Objects/Workflows
)
# <end_options>


# <start_handleropts>
@my_workflow.main(
    inactivity_timeout=timedelta(minutes=15),
    abort_timeout=timedelta(minutes=15),
    workflow_retention=timedelta(days=3),
    # -> or idempotency_retention for Services/Objects
    journal_retention=timedelta(days=7),
    ingress_private=True,
    enable_lazy_state=True, # only for Objects/Workflows
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