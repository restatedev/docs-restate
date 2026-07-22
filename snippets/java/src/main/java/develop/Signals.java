package develop;

import dev.restate.sdk.InvocationHandle;
import dev.restate.sdk.Restate;

public class Signals {

  // <start_one_shot>
  public Boolean waitForApproval() {
    return Restate.signal("approval", Boolean.class).await();
  }

  // <end_one_shot>

  // <start_wait>
  public String reviseUntilDone(String topic) {
    String draft = "Research notes for " + topic;

    while (true) {
      // Each call waits for the next resolution of the named signal.
      String text = Restate.signal("steer", String.class).await();
      if (text.equals("done")) {
        return draft;
      }
      draft = draft + "\n" + text;
    }
  }

  // <end_wait>

  // <start_resolve>
  public void steerInvocation(String invocationId, String text) {
    InvocationHandle<?> target = Restate.invocationHandle(invocationId);
    target.signal("steer").resolve(String.class, text);
  }
  // <end_resolve>
}
