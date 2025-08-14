package develop

import dev.restate.sdk.common.TimeoutException
import dev.restate.sdk.kotlin.Context
import kotlin.time.Duration.Companion.seconds

class DurableTimers {
  suspend fun timers(ctx: Context) {
    // <start_sleep>
    ctx.sleep(10.seconds)
    // <end_sleep>
  }

  suspend fun timeouts(ctx: Context) {
    // <start_timer>
    try {
      MyServiceClient.fromContext(ctx).myHandler("Hi!").await(5.seconds)
    } catch (e: TimeoutException) {
      // Handle the timeout
    }
    // <end_timer>
  }
}
