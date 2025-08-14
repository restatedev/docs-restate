package develop.utils;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class AnalyticsService {
  @Handler
  public int calculateMetric(Context ctx, Integer count) {
    // Simulate some analytics processing
    return 500;
  }
}
