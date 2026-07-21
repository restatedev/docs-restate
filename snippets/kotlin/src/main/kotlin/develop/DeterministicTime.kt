package develop

// <start_deterministic_time>
import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.kotlin.*
import kotlin.time.Clock
import kotlin.time.ExperimentalTime

@OptIn(ExperimentalTime::class)
@Handler
suspend fun myHandler(): String {
  val now = Clock.Restate.now()
  return "Current time: $now"
}
// <end_deterministic_time>
