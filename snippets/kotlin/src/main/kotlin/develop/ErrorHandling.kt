package develop

import dev.restate.sdk.common.TerminalException
import dev.restate.sdk.kotlin.Context

class ErrorHandling {
  fun errorHandling(ctx: Context) {
    // <start_here>
    throw TerminalException(500, "Something went wrong")
    // <end_here>
  }

  fun errorHandlingWithMetadata(ctx: Context) {
    // <start_metadata>
    throw TerminalException(
        "Something went wrong", mapOf("correlationId" to "abc123", "orderId" to "order-456"))
    // <end_metadata>
  }

  fun catchTerminalError(ctx: Context) {
    // <start_catch_metadata>
    try {
      // ... call some handler ...
    } catch (e: TerminalException) {
      val metadata = e.metadata
      val correlationId = metadata["correlationId"]
      // handle accordingly
    }
    // <end_catch_metadata>
  }
}
