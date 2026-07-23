package develop

// Demo app for the signals docs examples — run against a local Restate server on port 9085.
import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.annotation.Service
import dev.restate.sdk.kotlin.*
import dev.restate.sdk.kotlin.endpoint.*
import kotlin.time.Duration.Companion.seconds
import kotlinx.serialization.Serializable

@Serializable data class SteerRequest(val invocationId: String, val text: String)

@Serializable data class ApproveRequest(val invocationId: String, val approved: Boolean)

@Service
class Signals {

  // <start_one_shot>
  @Handler
  suspend fun waitForApproval(): Boolean {
    return signal<Boolean>("approval").await()
  }

  // <end_one_shot>

  // <start_wait>
  @Handler
  suspend fun reviseUntilDone(topic: String): String {
    var draft = "Research notes for $topic"
    while (true) {
      val text = signal<String>("steer").await()
      if (text == "done") {
        return draft
      }
      draft = "$draft\n$text"
    }
  }

  // <end_wait>

  @Handler
  suspend fun sleepThenWait(): String {
    sleep(3.seconds)
    return signal<String>("steer").await()
  }

  // <start_resolve>
  @Handler
  suspend fun steerInvocation(req: SteerRequest) {
    invocationHandle<Unit>(req.invocationId).signal("steer").resolve(req.text)
  }

  // <end_resolve>

  @Handler
  suspend fun approve(req: ApproveRequest) {
    invocationHandle<Unit>(req.invocationId).signal("approval").resolve(req.approved)
  }

  @Handler
  suspend fun deny(req: SteerRequest) {
    invocationHandle<Unit>(req.invocationId).signal("approval").reject("Request denied")
  }
}
