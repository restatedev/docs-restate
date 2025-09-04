package develop;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.RetryPolicy;
import dev.restate.sdk.common.TerminalException;
import java.time.Duration;

@Service
public class Retries {

  @Handler
  public String myHandler(Context ctx, String greeting) {

    // <start_here>
      RetryPolicy myRunRetryPolicy =
          RetryPolicy.defaultPolicy()
              .setInitialDelay(Duration.ofSeconds(1))
              .setMaxAttempts(3);
      String payRef = ctx.run(
              "pay",
              myRunRetryPolicy,
              String.class,
              () -> createRecurringPayment(req.creditCard(), paymentId));
    // <end_here>

    return greeting + "!";
  }

    public static String createRecurringPayment(String s, String paymentId) {
        System.out.printf(">>> Creating recurring payment %s\n", paymentId);
        return UUID.randomUUID().toString();
    }

  private void writeToOtherSystem() {}
}
