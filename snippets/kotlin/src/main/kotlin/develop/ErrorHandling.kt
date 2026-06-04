package develop

import dev.restate.sdk.common.TerminalException
import dev.restate.sdk.kotlin.Context

class ErrorHandling {
  fun errorHandling(ctx: Context) {
    // <start_here>
    throw TerminalException(500, "Something went wrong")
    // <end_here>
  }

  fun errorHandlingWithMetadata(ctx: Context, correlationId: String) {
    // <start_metadata>
    throw TerminalException("Something went wrong", mapOf("correlationId" to correlationId))
    // <end_metadata>
  }

  fun catchMetadata(ctx: Context) {
    try {
      // ... some operation
    } catch (e: TerminalException) {
      // <start_catch_metadata>
      val metadata = e.metadata
      val correlationId = metadata["correlationId"]
      // <end_catch_metadata>
    }
  }
}
