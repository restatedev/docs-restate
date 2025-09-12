package usecases.microservices;

import dev.restate.sdk.Context;
import dev.restate.sdk.DurableFuture;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;
import usecases.microservices.utils.Order;
import usecases.microservices.utils.Order.Item;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

class PaymentResult {}

@Service
public class ServiceActions {

  @Handler
  public void process(Context ctx, Order order) {
    String item = "item-123";

    // <start_communication>
    // Request-response: Wait for result
    var result = InventoryServiceClient.fromContext(ctx)
        .checkStock(item);

    // Fire-and-forget: Guaranteed delivery without waiting
    EmailServiceClient.fromContext(ctx)
        .send()
        .sendConfirmation(order);

    // Delayed execution: Schedule for later
    ReminderServiceClient.fromContext(ctx)
        .send()
        .sendReminder(order, Duration.ofDays(7));
    // <end_communication>

    // <start_awakeables>
    // Wait for external payment confirmation
    var confirmation = ctx.<PaymentResult>awakeable(PaymentResult.class);
    ctx.run("start-payment", () -> startPayment(order, confirmation.id()));
    confirmation.await(Duration.ofMinutes(30));
    // <end_awakeables>
  }

  @Handler
  public void parallelProcess(Context ctx, Order order) {
    // <start_parallel>
    // Process all items in parallel
    List<DurableFuture<?>> itemFutures = new ArrayList<>();
    for (Item item : order.items) {
      itemFutures.add(ctx.runAsync( () -> processItem(item)));
    }

    DurableFuture.all(itemFutures).await();
    // <end_parallel>
  }

  private Void startPayment(Order order, String awakeableId) {
    // Simulate starting payment with awakeable ID
    return null;
  }

  private Void processItem(Item item) {
    // Simulate item processing
    return null;
  }
}

@Service
class InventoryService {
  public static class StockResult {
    public String item;
    public boolean inStock;
    
    public StockResult(String item, boolean inStock) {
      this.item = item;
      this.inStock = inStock;
    }
  }

  @Handler
  public StockResult checkStock(Context ctx, String item) {
    // Simulate stock check
    return new StockResult(item, true);
  }
}

@Service
class EmailService {
  @Handler
  public void sendConfirmation(Context ctx, Order order) {
    // Simulate sending email
    System.out.println("Sending confirmation for order " + order.id);
  }

  public static void main(String[] args) {
    RestateHttpServer.listen(
            Endpoint
                    .bind(new EmailService())
                    .bind(new ReminderService())
                    .bind(new ServiceActions())
                    .build()
    );
  }
}

@Service
class ReminderService {
  @Handler
  public void sendReminder(Context ctx, Order order) {
    // Simulate sending reminder
    System.out.println("Sending reminder for order " + order.id);
  }
}