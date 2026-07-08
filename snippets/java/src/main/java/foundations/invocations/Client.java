package foundations.invocations;

import dev.restate.client.Client;
import dev.restate.common.InvocationOptions;
import dev.restate.sdk.*;
import dev.restate.sdk.annotation.*;

@Service
class MyService {
  @Handler
  public String myHandler(String greeting) {
    return greeting + "!";
  }
}

@Service
class GreeterService {
  @Handler
  public String greet() {
    // <start_attach>
    var handle =
        Restate.serviceHandle(MyService.class)
            .send(MyService::myHandler, "Hi", InvocationOptions.idempotencyKey("my-key"));
    var response = handle.attach().await();
    // <end_attach>
    return "Hi!";
  }

  @Handler
  public void cancel() {

    // <start_cancel>
    var handle = Restate.serviceHandle(MyService.class).send(MyService::myHandler, "Hi");

    // Cancel the invocation
    handle.cancel();
    // <end_cancel>
  }
}

class MyClient {
  public static void call() {
    var req = "Hi";
    // <start_here>
    var restate = Client.connect("http://localhost:8080");

    // To call a service:
    restate.service(MyService.class).myHandler(req);
    // <end_here>
  }
}
