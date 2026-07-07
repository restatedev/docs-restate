package develop

import dev.restate.sdk.kotlin.*

class Awakeables {
  suspend fun awakeables() {
    // <start_here>
    // Create awakeable and get unique ID
    val awakeable = awakeable<String>()
    val awakeableId = awakeable.id

    // Send ID to external system (email, queue, webhook, etc.)
    runBlock { requestHumanReview(awakeableId) }

    // Handler suspends here until external completion
    val review = awakeable.await()
    // <end_here>

    // <start_resolve>
    // Complete with success data
    awakeableHandle(awakeableId).resolve("Looks good!")
    // <end_resolve>

    // <start_reject>
    // Complete with error
    awakeableHandle(awakeableId).reject("This cannot be reviewed.")
    // <end_reject>
  }

  private fun requestHumanReview(awakeableId: String): String {
    return "hello"
  }
}
