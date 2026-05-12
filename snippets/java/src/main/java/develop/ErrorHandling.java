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
        "Something went wrong", Map.of("correlationId", "abc123", "orderId", "order-456"));
    // <end_metadata>

  }

  public void catchTerminalError(Context ctx) {

    // <start_catch_metadata>
    try {
      // ... call some handler ...
    } catch (TerminalException e) {
      Map<String, String> metadata = e.getMetadata();
      String correlationId = metadata.get("correlationId");
      // handle accordingly
    }
    // <end_catch_metadata>

  }
}
