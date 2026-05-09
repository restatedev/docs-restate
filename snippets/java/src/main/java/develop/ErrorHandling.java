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
        "Something went wrong", Map.of("correlationId", "abc123", "service", "payment"));
    // <end_metadata>

  }

  public void catchTerminalException(Context ctx) {
    // <start_catch_metadata>
    try {
      // some operation
    } catch (TerminalException e) {
      String correlationId = e.getMetadata().get("correlationId");
      // handle using metadata
    }
    // <end_catch_metadata>
  }
}
