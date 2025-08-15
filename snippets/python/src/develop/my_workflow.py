import restate

my_workflow = restate.Workflow("MyWorkflow")


@my_workflow.main()
async def run(ctx: restate.WorkflowContext, req: str) -> str:
    # ... implement workflow logic here ---
    return "success"


@my_workflow.handler()
async def interact_with_workflow(ctx: restate.WorkflowSharedContext, req: str):
    # ... implement interaction logic here ...
    return


app = restate.app([my_workflow])
