package develop

// <start_here>
import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.annotation.Shared
import dev.restate.sdk.annotation.VirtualObject
import dev.restate.sdk.http.vertx.RestateHttpServer
import dev.restate.sdk.kotlin.*
import dev.restate.sdk.kotlin.endpoint.*

@VirtualObject
class MyObject {

  @Handler
  suspend fun myHandler(ctx: ObjectContext, greeting: String): String {
    val objectKey = ctx.key()

    return "$greeting $objectKey!"
  }

  @Shared suspend fun myConcurrentHandler(ctx: SharedObjectContext, input: String) = "my-output"
}

fun main() {
  RestateHttpServer.listen(endpoint { bind(MyObject()) })
}
// <end_here>
