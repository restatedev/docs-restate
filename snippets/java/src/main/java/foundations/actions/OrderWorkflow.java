package foundations.actions;

import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;

@Workflow
public class OrderWorkflow {
  @Workflow
  public void run(Order order) {
    // Implementation
  }

  @Shared
  public String getStatus() {
    return "pending";
  }
}
