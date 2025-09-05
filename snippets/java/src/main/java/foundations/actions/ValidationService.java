package foundations.actions;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class ValidationService {
  @Handler
  public ValidationResult validateOrder(Context ctx, Object order) {
    return new ValidationResult(true);
  }

  public record ValidationResult(boolean valid) {}
}
