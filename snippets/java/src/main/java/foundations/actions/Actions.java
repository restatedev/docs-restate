package foundations.actions;

import static foundations.actions.ExternalAPI.fetchData;
import static foundations.actions.ExternalAPI.updateUserDatabase;

import dev.restate.sdk.*;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.TimeoutException;
import foundations.actions.NotificationService.EmailRequest;
import foundations.actions.ReminderService.ReminderRequest;
import java.time.Duration;
import java.util.Map;

// Example service that demonstrates all actions
@Service
public class Actions {

  @Handler
  public void durableStepsExample(Context ctx, String userId) {
    var user = "";

    // <start_durable_steps>
    // External API call
    Object apiResult = ctx.run(String.class, () -> fetchData("https://api.example.com/data"));

    // Database operation
    String dbResult = ctx.run(String.class, () -> updateUserDatabase(userId, user));

    // Idempotency key generation
    String id = ctx.random().nextUUID().toString();
    // <end_durable_steps>
  }

  @Handler
  public void serviceCallsExample(Context ctx, ServiceCallRequest req) {
    // <start_service_calls>
    // Call another service
    var validation = ValidationServiceClient.fromContext(ctx).validateOrder(req.order()).await();

    // Call Virtual Object function
    var profile = UserAccountClient.fromContext(ctx, req.userId()).getProfile().await();

    // Submit Workflow
    var result = OrderWorkflowClient.fromContext(ctx, req.orderId()).run(req.order()).await();
    // <end_service_calls>
  }

  @Handler
  public void sendingMessagesExample(Context ctx, String userId) {
    var event = Map.of("kind", "user_signup", "userId", userId);
    // <start_sending_messages>
    // Fire-and-forget notification
    NotificationServiceClient.fromContext(ctx)
        .send()
        .sendEmail(new EmailRequest(userId, "Welcome!"));

    // Background analytics
    AnalyticsServiceClient.fromContext(ctx).send().recordEvent(event);

    // Cleanup task
    ShoppingCartObjectClient.fromContext(ctx, userId).send().emptyExpiredCart();
    // <end_sending_messages>
  }

  @Handler
  public void delayedMessagesExample(Context ctx, DelayedMessageRequest req) {
    var reminderRequest = new ReminderRequest(req.userId(), req.message());
    // <start_delayed_messages>
    // Schedule reminder for tomorrow
    ReminderServiceClient.fromContext(ctx).send().sendReminder(reminderRequest, Duration.ofDays(1));
    // <end_delayed_messages>
  }

  @Handler
  public void durableTimersExample(Context ctx, TimerRequest req) {
    // <start_durable_timers>
    // Sleep for specific duration
    ctx.sleep(Duration.ofMinutes(5)); // 5 minutes

    // Wait for action or timeout
    try {
      OrderWorkflowClient.fromContext(ctx, req.orderId())
          .run(req.order())
          .await(Duration.ofMinutes(5));
    } catch (TimeoutException e) {
      // Handle timeout
    }
    // <end_durable_timers>
  }

  // Helper classes
  public record ServiceCallRequest(String userId, String orderId, Order order) {}

  public record DelayedMessageRequest(String userId, String message) {}

  public record TimerRequest(String userId, String orderId, Order order) {}
}
