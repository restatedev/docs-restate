package develop;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TerminalException;
import java.util.Map;

public class ErrorHandling {

  public void errorHandling(Context ctx) {

    // <start_here>
    throw new TerminalException(500, "Something went wrong");
    // <end_here>

  }

  public void errorHandlingWithMetadata(Context ctx) {

    // <start_metadata>
    throw new TerminalException(
        "Something went wrong",
        Map.of("correlationId", "abc123", "orderId", "ord-456"));
    // <end_metadata>

  }

  public void catchErrorWithMetadata(Context ctx, String input) {
    // <start_catch_metadata>
    try {
      MyServiceClient.fromContext(ctx).myMethod(input).await();
    } catch (TerminalException e) {
      String correlationId = e.getMetadata().get("correlationId");
      // Handle the error using metadata context
      throw e;
    }
    // <end_catch_metadata>
  }
}
