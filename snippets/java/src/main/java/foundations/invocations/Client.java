package foundations.invocations;

import dev.restate.client.Client;
import dev.restate.sdk.*;
import dev.restate.sdk.annotation.*;

@Service
class MyService {
  @Handler
  public String myHandler(Context ctx, String greeting) {
    return greeting + "!";
  }
}

@Service
class GreeterService {
  @Handler
  public String greet(Context ctx) {
    // <start_attach>
    var handle =
        MyServiceClient.fromContext(ctx)
            .send()
            .myHandler("Hi", opt -> opt.idempotencyKey("my-key"));
    var response = handle.attach().await();
    // <end_attach>
    return "Hi!";
  }

  @Handler
  public void cancel(Context ctx) {

    // <start_cancel>
    var handle = MyServiceClient.fromContext(ctx).send().myHandler("Hi");

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
    MyServiceClient.fromClient(restate).myHandler(req);
    // <end_here>
  }
}
