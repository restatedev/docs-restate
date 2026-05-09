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
        "Something went wrong", mapOf("correlationId" to "abc123", "service" to "payment"))
    // <end_metadata>
  }

  fun catchTerminalException(ctx: Context) {
    // <start_catch_metadata>
    try {
      // some operation
    } catch (e: TerminalException) {
      val correlationId = e.metadata["correlationId"]
      // handle using metadata
    }
    // <end_catch_metadata>
  }
}
