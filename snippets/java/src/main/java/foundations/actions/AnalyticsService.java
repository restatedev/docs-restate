package foundations.actions;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class AnalyticsService {
  @Handler
  public void recordEvent(Context ctx, Object event) {
    // Implementation
  }
}
