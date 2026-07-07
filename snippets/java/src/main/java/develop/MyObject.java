package develop;

// <start_here>
import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

@VirtualObject
public class MyObject {

  @Handler
  public String myHandler(String greeting) {
    String objectId = Restate.key();

    return greeting + " " + objectId + "!";
  }

  @Shared
  public String myConcurrentHandler(String input) {
    return "my-output";
  }

  public static void main(String[] args) {
    RestateHttpServer.listen(Endpoint.bind(new MyObject()));
  }
}
// <end_here>
