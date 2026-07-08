package tour.microservices;

import dev.restate.sdk.common.TerminalException;

public class ErrorHandler {

  public void errorHandling() {

    // <start_here>
    throw new TerminalException("Invalid credit card");
    // <end_here>

  }
}
