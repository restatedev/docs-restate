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
    throw TerminalException("Something went wrong", mapOf("correlationId" to "abc123"))
    // <end_metadata>
  }

  suspend fun catchMetadata(ctx: Context) {
    // <start_catch_metadata>
    try {
      MyServiceClient.fromContext(ctx).myHandler("input").await()
    } catch (e: TerminalException) {
      val correlationId = e.metadata["correlationId"]
    }
    // <end_catch_metadata>
  }
}
