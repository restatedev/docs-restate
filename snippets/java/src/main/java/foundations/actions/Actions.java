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
  public void durableStepsExample(String userId) {
    var user = "";

    // <start_durable_steps>
    // External API call
    String apiResult =
        Restate.run("fetchData", String.class, () -> fetchData("https://api.example.com/data"));

    // Database operation
    boolean dbResult =
        Restate.run("updateUserDatabase", Boolean.class, () -> updateUserDatabase(userId, user));

    // Idempotency key generation
    String id = Restate.random().nextUUID().toString();
    // <end_durable_steps>
  }

  @Handler
  public void serviceCallsExample(ServiceCallRequest req) {
    // <start_service_calls>
    // Call another service
    var validation =
        Restate.serviceHandle(ValidationService.class)
            .call(ValidationService::validateOrder, req.order())
            .await();

    // Call Virtual Object function
    var profile =
        Restate.virtualObjectHandle(UserAccount.class, req.userId())
            .call(UserAccount::getProfile)
            .await();

    // Submit Workflow
    var result =
        Restate.workflowHandle(OrderWorkflow.class, req.orderId())
            .call(OrderWorkflow::run, req.order())
            .await();
    // <end_service_calls>
  }

  @Handler
  public void sendingMessagesExample(String userId) {
    var event = Map.of("kind", "user_signup", "userId", userId);
    // <start_sending_messages>
    // Fire-and-forget notification
    Restate.serviceHandle(NotificationService.class)
        .send(NotificationService::sendEmail, new EmailRequest(userId, "Welcome!"));

    // Background analytics
    Restate.serviceHandle(AnalyticsService.class).send(AnalyticsService::recordEvent, event);

    // Cleanup task
    Restate.virtualObjectHandle(ShoppingCartObject.class, userId)
        .send(ShoppingCartObject::emptyExpiredCart);
    // <end_sending_messages>
  }

  @Handler
  public void delayedMessagesExample(DelayedMessageRequest req) {
    var reminderRequest = new ReminderRequest(req.userId(), req.message());
    // <start_delayed_messages>
    // Schedule reminder for tomorrow
    Restate.serviceHandle(ReminderService.class)
        .send(ReminderService::sendReminder, reminderRequest, Duration.ofDays(1));
    // <end_delayed_messages>
  }

  @Handler
  public void durableTimersExample(TimerRequest req) {
    // <start_durable_timers>
    // Sleep for specific duration
    Restate.sleep(Duration.ofMinutes(5)); // 5 minutes

    // Wait for action or timeout
    try {
      Restate.workflowHandle(OrderWorkflow.class, req.orderId())
          .call(OrderWorkflow::run, req.order())
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
