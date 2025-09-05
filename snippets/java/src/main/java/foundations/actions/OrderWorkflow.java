package foundations.actions;

import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;

@Workflow
public class OrderWorkflow {
  @Workflow
  public void run(WorkflowContext ctx, Order order) {
    // Implementation
  }

  @Shared
  public String getStatus(SharedWorkflowContext ctx) {
    return "pending";
  }
}
