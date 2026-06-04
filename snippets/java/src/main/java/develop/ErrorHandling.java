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

  public void errorHandlingWithMetadata(Context ctx, String correlationId) {

    // <start_metadata>
    throw new TerminalException("Something went wrong", Map.of("correlationId", correlationId));
    // <end_metadata>

  }

  public void catchMetadata(Context ctx) {
    try {
      // ... some operation
    } catch (TerminalException e) {
      // <start_catch_metadata>
      Map<String, String> metadata = e.getMetadata();
      String correlationId = metadata.get("correlationId");
      // <end_catch_metadata>
    }
  }
}
