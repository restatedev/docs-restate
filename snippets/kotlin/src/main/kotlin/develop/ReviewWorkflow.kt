package develop

import dev.restate.sdk.annotation.Shared
import dev.restate.sdk.annotation.Workflow
import dev.restate.sdk.kotlin.*

// <start_here>
@Workflow
class ReviewWorkflow {

  companion object {
    // <start_promise_key>
    val REVIEW_PROMISE = durablePromiseKey<String>("review")
    // <end_promise_key>
  }

  @Workflow
  suspend fun run(documentId: String): String {
    // Send document for review
    runBlock { askReview(documentId) }

    // Wait for external review submission
    // <start_promise>
    val review: String = promise(REVIEW_PROMISE).future().await()
    // <end_promise>

    // Process the review result
    return processReview(documentId, review)
  }

  @Shared
  suspend fun submitReview(review: String) {
    // Resolve the workflow promise awaited by the run handler
    // <start_resolve_promise>
    promiseHandle(REVIEW_PROMISE).resolve(review)
    // <end_resolve_promise>
  }
}

// <end_here>

public suspend fun askReview(documentId: String): String {
  // Simulate sending document for review
  // In a real scenario, this could be an email, message queue, etc.
  return "Review requested for document $documentId"
}

public fun processReview(documentId: String, review: String): String {
  // Process the review result
  return "Processed review for document $documentId: $review"
}
