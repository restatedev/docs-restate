package develop

import dev.restate.sdk.kotlin.invocationHandle
import dev.restate.sdk.kotlin.resolve
import dev.restate.sdk.kotlin.signal

class Signals {
  // <start_wait>
  suspend fun reviseUntilDone(topic: String): String {
    var draft = "Research notes for $topic"

    while (true) {
      // Each call waits for the next resolution of the named signal.
      val text = signal<String>("steer").await()
      if (text == "done") {
        return draft
      }
      draft = "$draft\n$text"
    }
  }

  // <end_wait>

  // <start_resolve>
  suspend fun steerInvocation(invocationId: String, text: String) {
    invocationHandle<Any>(invocationId).signal("steer").resolve(text)
  }
  // <end_resolve>
}
