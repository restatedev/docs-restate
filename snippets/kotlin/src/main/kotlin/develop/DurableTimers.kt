package develop

import dev.restate.sdk.common.TimeoutException
import dev.restate.sdk.kotlin.*
import kotlin.time.Duration.Companion.seconds

class DurableTimers {
  suspend fun timers() {
    // <start_sleep>
    sleep(10.seconds)
    // <end_sleep>
  }

  suspend fun timeouts() {
    // <start_timer>
    try {
      toService<MyService>().request { myHandler("Hi!") }.call().await(5.seconds)
    } catch (e: TimeoutException) {
      // Handle the timeout
    }
    // <end_timer>
  }
}
