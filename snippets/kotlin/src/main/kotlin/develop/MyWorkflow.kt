package develop

// <start_here>
import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.annotation.Workflow
import dev.restate.sdk.http.vertx.RestateHttpServer
import dev.restate.sdk.kotlin.*
import dev.restate.sdk.kotlin.endpoint.*

@Workflow
class MyWorkflow {

  @Workflow
  suspend fun run(input: String): String {
    // implement workflow logic here

    return "success"
  }

  @Handler
  suspend fun interactWithWorkflow(input: String): String {
    // implement interaction logic here
    return "my result"
  }
}

fun main() {
  RestateHttpServer.listen(endpoint { bind(MyWorkflow()) })
}
// <end_here>
