package foundations.actions;

import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class NotificationService {
  @Handler
  public void sendEmail(EmailRequest req) {
    // Implementation
  }

  @Handler
  public void sendNotification(String msg) {
    // Implementation
  }

  public record EmailRequest(String userId, String message) {}
}
