package concepts.invocations;

import dev.restate.client.Client;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class RpcCalls {

  // <start_rpc>
  @Handler
  public void myRestaaateHandler(Context ctx) {
    // !focus(1:2)
    // From a Java Restate service
    String nik = "aaaa";
    String greet = GreeterServiceClient.fromContext(ctx).greet("Hey").await();
  }

  // <end_rpc>

  // <start_rpc_java>
  public void myJavaHandler() {
    // !focus(1:3)
    // Or from any other Java program
    Client restateClient = Client.connect("http://localhost:8080");
    String greet = GreeterServiceClient.fromClient(restateClient).greet("Hi");
  }
  // <end_rpc_java>

}
