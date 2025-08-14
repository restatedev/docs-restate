package develop

import dev.restate.sdk.kotlin.*

class Awakeables {
  suspend fun awakeables(ctx: ObjectContext) {
    // <start_here>
    // Create awakeable and get unique ID
    val awakeable = ctx.awakeable<String>()
    val awakeableId: String = awakeable.id

    // Send ID to external system (email, queue, webhook, etc.)
    ctx.runBlock { requestHumanReview(awakeableId) }

    // Handler suspends here until external completion
    val review: String = awakeable.await()
    // <end_here>

    // <start_resolve>
    // Complete with success data
    ctx.awakeableHandle(awakeableId).resolve("Looks good!")
    // <end_resolve>

    // <start_reject>
    // Complete with error
    ctx.awakeableHandle(awakeableId).reject("This cannot be reviewed.")
    // <end_reject>
  }

  private fun requestHumanReview(awakeableId: String): String { return "hello" }
}
