package foundations.actions;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class NotificationService {
  @Handler
  public void sendEmail(Context ctx, EmailRequest req) {
    // Implementation
  }

  @Handler
  public void sendNotification(Context ctx, String msg) {
    // Implementation
  }

  public record EmailRequest(String userId, String message) {}
}
