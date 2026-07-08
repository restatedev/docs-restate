package tour.workflows;

import dev.restate.sdk.annotation.Workflow;

@Workflow
public class SignupWorkflow {

  @Workflow
  public boolean run() {
    return true;
  }
}
