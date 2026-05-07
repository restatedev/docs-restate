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
        500,
        "Something went wrong",
        mapOf("correlationId" to "abc123", "requestId" to "req-456"),
    )
    // <end_metadata>
  }

  fun catchTerminalError(ctx: Context) {
    // <start_catch>
    try {
      // ... some operation
    } catch (e: TerminalException) {
      // Access error metadata propagated from the callee
      val metadata = e.metadata
      val correlationId = metadata["correlationId"]
      // Handle the error
    }
    // <end_catch>
  }
}
