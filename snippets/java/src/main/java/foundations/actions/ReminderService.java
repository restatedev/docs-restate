package foundations.actions;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class ReminderService {
  @Handler
  public void sendReminder(Context ctx, ReminderRequest req) {
    // Implementation
  }

  public record ReminderRequest(String userId, String message) {}
}
