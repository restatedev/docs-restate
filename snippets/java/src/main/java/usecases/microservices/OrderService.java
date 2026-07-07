package usecases.microservices;

import static usecases.microservices.utils.Utils.chargePayment;
import static usecases.microservices.utils.Utils.reserveInventory;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.util.UUID;
import usecases.microservices.utils.Order;
import usecases.microservices.utils.OrderResult;

// <start_here>
@Service
public class OrderService {

  @Handler
  public OrderResult process(Order order) {
    // Each step is automatically durable and resumable
    String paymentId = UUID.randomUUID().toString();

    Restate.run("charge-payment", () -> chargePayment(order.creditCard, paymentId));

    for (var item : order.items) {
      Restate.run("reserve-inventory", () -> reserveInventory(item.id, item.quantity));
    }

    return new OrderResult(true, paymentId);
  }
}
// <end_here>
