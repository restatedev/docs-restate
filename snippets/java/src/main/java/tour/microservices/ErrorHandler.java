package develop;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TerminalException;

public class ErrorHandler {

  public void errorHandling(Context ctx) {

    // <start_here>
    throw new TerminalException("Invalid credit card");
    // <end_here>

  }
}
