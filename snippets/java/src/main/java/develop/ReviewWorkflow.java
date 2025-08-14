package develop;

import static develop.Utils.askReview;
import static develop.Utils.processReview;

import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;

// <start_here>
@Workflow
public class ReviewWorkflow {
  // <start_promise_key>
  private static final DurablePromiseKey<String> REVIEW_PROMISE =
      DurablePromiseKey.of("review", String.class);

  // <end_promise_key>

  @Workflow
  public String run(WorkflowContext ctx, String documentId) {
    // Send document for review
    ctx.run(() -> askReview(documentId));

    // Wait for external review submission
    // <start_promise>
    String review = ctx.promise(REVIEW_PROMISE).future().await();
    // <end_promise>

    // Process the review result
    return processReview(documentId, review);
  }

  @Shared
  public void submitReview(SharedWorkflowContext ctx, String review) {
    // Signal the waiting run handler
    // <start_resolve_promise>
    ctx.promiseHandle(REVIEW_PROMISE).resolve(review);
    // <end_resolve_promise>
  }
}
// <end_here>
