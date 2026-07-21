package develop;

import dev.restate.sdk.Awakeable;
import dev.restate.sdk.DurableFuture;
import dev.restate.sdk.Restate;
import dev.restate.sdk.Select;
import develop.utils.AnalyticsService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

record UserData(String name, String email) {}

record OrderHistory(List<String> orders) {}

record Metrics(double value) {}

class JournalingResults {

  void sideEffect() {

    // <start_side_effect>
    String output = Restate.run("db-request", String.class, () -> doDbRequest());
    // <end_side_effect>

    // <start_async_side_effect>
    DurableFuture<String> myRunFuture =
        Restate.runAsync("something-slow", String.class, () -> doSomethingSlow());
    // <end_async_side_effect>

    Awakeable<Boolean> a1 = Restate.awakeable(Boolean.class);
    Awakeable<Boolean> a2 = Restate.awakeable(Boolean.class);
    Awakeable<Boolean> a3 = Restate.awakeable(Boolean.class);

    // <start_parallel>
    // Start operations concurrently using DurableFuture
    var call1 = Restate.runAsync("fetch-user-data", UserData.class, () -> fetchUserData(123));
    var call2 =
        Restate.runAsync("fetch-order-history", OrderHistory.class, () -> fetchOrderHistory(123));
    var call3 =
        Restate.serviceHandle(AnalyticsService.class).call(AnalyticsService::calculateMetric, 123);

    // Now wait for results as needed
    UserData user = call1.await();
    OrderHistory orders = call2.await();
    Integer metric = call3.await();
    // <end_parallel>

    // <start_combine_all>
    DurableFuture.all(a1, a2, a3).await();
    // <end_combine_all>

    // <start_combine_any>
    boolean res = Select.<Boolean>select().or(a1).or(a2).or(a3).await();
    // <end_combine_any>

    // <start_uuid>
    UUID uuid = Restate.random().nextUUID();
    // <end_uuid>

    // <start_random_nb>
    int value = Restate.random().nextInt();
    // <end_random_nb>

    // <start_deterministic_time>
    Instant now = Restate.instantNow();
    // <end_deterministic_time>
  }

  private OrderHistory fetchOrderHistory(int i) {
    return new OrderHistory(new ArrayList<>(List.of("order1", "order2")));
  }

  private UserData fetchUserData(int i) {
    return new UserData("John Doe", "me@mail.com");
  }

  private String doDbRequest() {
    return "";
  }

  private String doSomethingSlow() {
    return "";
  }
}

class PaymentClient {
  public boolean call(String txId, int amount) {
    return true;
  }
}
