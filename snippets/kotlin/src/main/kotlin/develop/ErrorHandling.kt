package develop

import dev.restate.sdk.common.TerminalException

class ErrorHandling {
  fun errorHandling() {
    // <start_here>
    throw TerminalException(500, "Something went wrong")
    // <end_here>
  }

  fun errorHandlingWithMetadata(correlationId: String) {
    // <start_metadata>
    throw TerminalException("Something went wrong", mapOf("correlationId" to correlationId))
    // <end_metadata>
  }

  fun catchMetadata() {
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
