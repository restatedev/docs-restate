package develop;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dev.restate.client.Client;
import dev.restate.sdk.testing.BindService;
import dev.restate.sdk.testing.RestateClient;
import dev.restate.sdk.testing.RestateTest;
import org.junit.jupiter.api.Test;

@RestateTest
class MyServiceTestMethod {

  @BindService MyService service = new MyService();

  // <start_test>
  @Test
  void testMyHandler(@RestateClient Client ingressClient) {
    // Create the service client from the injected ingress client
    var client = MyServiceClient.fromClient(ingressClient);

    // Send request to service and assert the response
    var response = client.myHandler("Hi");
    assertEquals(response, "Hi!");
  }
  // <end_test>
}
