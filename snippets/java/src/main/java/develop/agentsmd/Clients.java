package develop.agentsmd;

import dev.restate.client.Client;
import dev.restate.common.InvocationOptions;
import develop.MyObject;
import develop.MyService;
import java.time.Duration;

public class Clients {

  public void clientExamples() {
    // <start_here>
    Client restateClient = Client.connect("http://localhost:8080");

    // Request-response
    String result = restateClient.service(MyService.class).myHandler("Hi");

    // One-way
    restateClient.serviceHandle(MyService.class).send(MyService::myHandler, "Hi");

    // Delayed
    restateClient
        .serviceHandle(MyService.class)
        .send(MyService::myHandler, "Hi", Duration.ofSeconds(1));

    // With idempotency key
    restateClient
        .virtualObjectHandle(MyObject.class, "Mary")
        .send(MyObject::myHandler, "Hi", InvocationOptions.idempotencyKey("abc"));
    // <end_here>
  }
}
