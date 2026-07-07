package develop

import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.annotation.VirtualObject
import dev.restate.sdk.http.vertx.RestateHttpServer
import dev.restate.sdk.kotlin.*
import dev.restate.sdk.kotlin.endpoint.*

@VirtualObject
class Greeter {

  companion object {
    private val COUNT = stateKey<Int>("count")
  }

  @Handler
  suspend fun greet(greeting: String): String {
    // Get the count and increment it
    val count = state().get(COUNT) ?: 1
    state().set(COUNT, count + 1)

    // Send the response back
    return "$greeting ${objectKey()} for the $count time!"
  }
}

fun main() {
  RestateHttpServer.listen(endpoint { bind(Greeter()) })
}
