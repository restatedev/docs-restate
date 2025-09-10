package tour.workflows;

import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Workflow;

@Workflow
public class SignupWorkflow {

  @Workflow
  public boolean run(WorkflowContext ctx) {
    return true;
  }
}
