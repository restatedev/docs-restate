package tour.workflows;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TerminalException;

public class WorkflowErrorHandler {

  public void errorHandling(Context ctx) {

    // <start_here>
    throw new TerminalException("Subscription plan not available");
    // <end_here>

  }
}
