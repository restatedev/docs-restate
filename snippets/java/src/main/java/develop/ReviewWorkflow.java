package develop;

import static develop.utils.Utils.askReview;
import static develop.utils.Utils.processReview;

import dev.restate.sdk.Restate;
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
  public String run(String documentId) {
    // Send document for review
    Restate.run("ask-review", () -> askReview(documentId));

    // Wait for external review submission
    // <start_promise>
    String review = Restate.promise(REVIEW_PROMISE).future().await();
    // <end_promise>

    // Process the review result
    return processReview(documentId, review);
  }

  @Shared
  public void submitReview(String review) {
    // Resolve the workflow promise awaited by the run handler
    // <start_resolve_promise>
    Restate.promiseHandle(REVIEW_PROMISE).resolve(review);
    // <end_resolve_promise>
  }
}
// <end_here>
