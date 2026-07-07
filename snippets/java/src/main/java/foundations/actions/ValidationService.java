package foundations.actions;

import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class ValidationService {
  @Handler
  public ValidationResult validateOrder(Object order) {
    return new ValidationResult(true);
  }

  public record ValidationResult(boolean valid) {}
}
