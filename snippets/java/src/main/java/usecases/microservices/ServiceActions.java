package usecases.microservices;

import dev.restate.sdk.DurableFuture;
import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import usecases.microservices.utils.EmailService;
import usecases.microservices.utils.InventoryService;
import usecases.microservices.utils.Order;
import usecases.microservices.utils.Order.Item;
import usecases.microservices.utils.PaymentResult;

@Service
public class ServiceActions {

  @Handler
  public void process(Order order) {
    String item = "item-123";

    // <start_communication>
    // Request-response: Wait for result
    var result = Restate.service(InventoryService.class).checkStock(item);

    // Fire-and-forget: Guaranteed delivery without waiting
    Restate.serviceHandle(EmailService.class).send(EmailService::emailTicket, order);

    // Delayed execution: Schedule for later
    Restate.serviceHandle(EmailService.class)
        .send(EmailService::sendReminder, order, Duration.ofDays(21));
    // <end_communication>

    // <start_awakeables>
    // Wait for external payment confirmation
    var confirmation = Restate.<PaymentResult>awakeable(PaymentResult.class);
    Restate.run("start-payment", () -> startPayment(order, confirmation.id()));
    confirmation.await(Duration.ofMinutes(30));
    // <end_awakeables>
  }

  @Handler
  public void parallelProcess(Order order) {
    // <start_parallel>
    // Process all items in parallel
    List<DurableFuture<?>> itemFutures = new ArrayList<>();
    for (Item item : order.items) {
      itemFutures.add(Restate.runAsync("process-item", () -> processItem(item)));
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
