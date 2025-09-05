package foundations.services;

import static foundations.services.BasicServiceHelpers.createRecurringPayment;
import static foundations.services.BasicServiceHelpers.createSubscription;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.util.UUID;

record SubscriptionRequest(String userId, String creditCard, String[] subscriptions) {}

class BasicServiceHelpers {
  public static String createRecurringPayment(String s, String paymentId) {
    System.out.printf(">>> Creating recurring payment %s\n", paymentId);
    return UUID.randomUUID().toString();
  }

  public static void createSubscription(String userId, String subscription, String payRef) {}
}

// <start_here>
@Service
public class SubscriptionService {

  @Handler
  public void add(Context ctx, SubscriptionRequest req) {
    var paymentId = ctx.random().nextUUID().toString();

    String payRef =
        ctx.run("pay", String.class, () -> createRecurringPayment(req.creditCard(), paymentId));

    for (String subscription : req.subscriptions()) {
      ctx.run("add-" + subscription, () -> createSubscription(req.userId(), subscription, payRef));
    }
  }
}
// <end_here>
