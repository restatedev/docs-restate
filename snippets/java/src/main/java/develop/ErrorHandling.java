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
        500, "Something went wrong", Map.of("correlationId", "abc123", "requestId", "req-456"));
    // <end_metadata>

  }

  public void catchTerminalError(Context ctx) throws Exception {

    // <start_catch>
    try {
      // ... some operation
    } catch (TerminalException e) {
      // Access error metadata propagated from the callee
      Map<String, String> metadata = e.getMetadata();
      String correlationId = metadata.get("correlationId");
      // Handle the error
    }
    // <end_catch>

  }
}
