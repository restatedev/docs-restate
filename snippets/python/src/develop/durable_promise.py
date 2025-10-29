import restate

# <start_review>
review_workflow = restate.Workflow("ReviewWorkflow")


@review_workflow.main()
async def run(ctx: restate.WorkflowContext, document_id: str):
    # Send document for review
    await ctx.run_typed("ask review", ask_review, document_id=document_id)

    # Wait for external review submission
    # <start_promise>
    review = await ctx.promise("review", type_hint=str).value()
    # <end_promise>

    # Process the review result
    return process_review(document_id, review)


@review_workflow.handler()
async def submit_review(ctx: restate.WorkflowSharedContext, review: str):
    # Signal the waiting run handler
    # <start_resolve_promise>
    await ctx.promise("review", type_hint=str).resolve(review)
    # <end_resolve_promise>


app = restate.app([review_workflow])
# <end_review>


def ask_review(document_id: str) -> str:
    # Simulate asking for a review
    return f"Review requested for document {document_id}"


def process_review(document_id: str, review: str) -> str:
    # Simulate processing the review
    return f"Processed review '{review}' for document {document_id}"
