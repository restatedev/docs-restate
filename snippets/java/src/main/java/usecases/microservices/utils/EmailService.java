package usecases.microservices.utils;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;
import usecases.microservices.ServiceActions;

@Service
public class EmailService {
  @Handler
  public void emailTicket(Context ctx, Order order) {
    // Simulate sending email
    System.out.println("Sending confirmation for order " + order.id);
  }

  @Handler
  public void sendReminder(Context ctx, Order order) {
    // Simulate sending reminder
    System.out.println("Sending reminder for order " + order.id);
  }

  public static void main(String[] args) {
    RestateHttpServer.listen(Endpoint.bind(new EmailService()).bind(new ServiceActions()).build());
  }
}
