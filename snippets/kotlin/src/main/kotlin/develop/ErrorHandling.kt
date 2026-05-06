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
        "Something went wrong",
        mapOf("correlationId" to "abc123", "orderId" to "ord-456"))
    // <end_metadata>
  }

  suspend fun catchErrorWithMetadata(ctx: Context, input: String) {
    // <start_catch_metadata>
    try {
      MyServiceClient.fromContext(ctx).myMethod(input).await()
    } catch (e: TerminalException) {
      val correlationId = e.metadata["correlationId"]
      // Handle the error using metadata context
      throw e
    }
    // <end_catch_metadata>
  }
}
