package tour.microservices;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.RetryPolicy;
import java.time.Duration;
import java.util.UUID;

record SubscriptionRequest(String userId, String creditCard, String[] subscriptions) {}

@Service
public class Retries {

  @Handler
  public String myHandler(Context ctx, SubscriptionRequest req) {
    var paymentId = ctx.random().nextUUID().toString();

    // <start_here>
    RetryPolicy myRunRetryPolicy =
        RetryPolicy.defaultPolicy().setInitialDelay(Duration.ofSeconds(1)).setMaxAttempts(3);
    String payRef =
        ctx.run(
            "pay",
            String.class,
            myRunRetryPolicy,
            () -> createRecurringPayment(req.creditCard(), paymentId));
    // <end_here>

    return "Hi!";
  }

  public static String createRecurringPayment(String s, String paymentId) {
    System.out.printf(">>> Creating recurring payment %s\n", paymentId);
    return UUID.randomUUID().toString();
  }
}
