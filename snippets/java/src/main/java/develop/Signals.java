package develop;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.time.Duration;

// Demo app for the signals docs examples — run against a local Restate server on port 9084.
@Service
public class Signals {

  public record SteerRequest(String invocationId, String text) {}

  public record ApproveRequest(String invocationId, boolean approved) {}

  // <start_one_shot>
  @Handler
  public Boolean waitForApproval() {
    return Restate.signal("approval", Boolean.class).await();
  }

  // <end_one_shot>

  // <start_wait>
  @Handler
  public String reviseUntilDone(String topic) {
    String draft = "Research notes for " + topic;
    while (true) {
      String text = Restate.signal("steer", String.class).await();
      if (text.equals("done")) {
        return draft;
      }
      draft = draft + "\n" + text;
    }
  }

  // <end_wait>

  @Handler
  public String sleepThenWait() {
    Restate.sleep(Duration.ofSeconds(3));
    return Restate.signal("steer", String.class).await();
  }

  // <start_resolve>
  @Handler
  public void steerInvocation(SteerRequest req) {
    Restate.invocationHandle(req.invocationId()).signal("steer").resolve(String.class, req.text());
  }

  // <end_resolve>

  @Handler
  public void approve(ApproveRequest req) {
    Restate.invocationHandle(req.invocationId())
        .signal("approval")
        .resolve(Boolean.class, req.approved());
  }

  @Handler
  public void deny(SteerRequest req) {
    Restate.invocationHandle(req.invocationId()).signal("approval").reject("Request denied");
  }
}
