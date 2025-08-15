package develop

import dev.restate.client.Client
import dev.restate.sdk.testing.BindService
import dev.restate.sdk.testing.RestateClient
import dev.restate.sdk.testing.RestateTest
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

@RestateTest
class MyServiceTestMethod {

  @BindService val service = MyService()

  // <start_test>
  @Test
  fun testMyHandler(@RestateClient ingressClient: Client) = runTest {
    // Create the service client from the injected ingress client
    val client = MyServiceClient.fromClient(ingressClient)

    // Send request to service and assert the response
    val response = client.myHandler("Hi")
    assertEquals(response, "Hi!")
  }
  // <end_test>
}
