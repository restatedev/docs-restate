package foundations.services;

import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;

// <start_here>
public class App {
  public static void main(String[] args) {
    RestateHttpServer.listen(
        Endpoint.builder()
            .bind(new SubscriptionService())
            .bind(new ShoppingCartObject())
            .bind(new SignupWorkflow())
            .build());
  }
}
// <end_here>
