package develop;

import dev.restate.sdk.Context;
import dev.restate.sdk.common.TimeoutException;
import java.time.Duration;

public class DurableTimers {

  public void timers(Context ctx) {
    // <start_sleep>
    ctx.sleep(Duration.ofSeconds(10));
    // <end_sleep>
  }

  public void timeouts(Context ctx) {
    // <start_timer>
    try {
      MyServiceClient.fromContext(ctx).myHandler("Hi!").await(Duration.ofSeconds(5));
    } catch (TimeoutException e) {
      // Handle the timeout error
    }
    // <end_timer>
  }
}
