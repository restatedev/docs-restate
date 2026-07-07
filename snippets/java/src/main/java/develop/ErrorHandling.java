package develop;

import dev.restate.sdk.common.TerminalException;
import java.util.Map;

public class ErrorHandling {

  public void errorHandling() {

    // <start_here>
    throw new TerminalException(500, "Something went wrong");
    // <end_here>

  }

  public void errorHandlingWithMetadata(String correlationId) {

    // <start_metadata>
    throw new TerminalException("Something went wrong", Map.of("correlationId", correlationId));
    // <end_metadata>

  }

  public void catchMetadata() {
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
