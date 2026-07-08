package develop;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;

@VirtualObject
public class MyKafkaVirtualObject {

  @Handler
  public void handle(String req) {
    // <start_headers>
    Restate.request().headers();
    // <end_headers>
  }
}
