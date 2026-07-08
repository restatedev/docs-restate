package develop;

import dev.restate.sdk.Restate;
import dev.restate.sdk.common.TimeoutException;
import java.time.Duration;

public class DurableTimers {

  public void timers() {
    // <start_sleep>
    Restate.sleep(Duration.ofSeconds(10));
    // <end_sleep>
  }

  public void timeouts() {
    // <start_timer>
    try {
      Restate.serviceHandle(MyService.class)
          .call(MyService::myHandler, "Hi!")
          .await(Duration.ofSeconds(5));
    } catch (TimeoutException e) {
      // Handle the timeout error
    }
    // <end_timer>
  }
}
