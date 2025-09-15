package usecases.workflows;

import static usecases.workflows.utils.DomainModels.*;
import static usecases.workflows.utils.UserUtils.*;

import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Workflow;

// <start_here>
@Workflow
public class UserSignup {

  @Workflow
  public boolean run(WorkflowContext ctx, User user) {
    String userId = ctx.key(); // unique workflow key

    // Use regular if/else, loops, and functions
    boolean success = ctx.run("create", Boolean.class, () -> createUser(userId, user));
    if (!success) {
      return false;
    }

    // Execute durable steps
    ctx.run("activate", () -> activateUser(userId));
    ctx.run("welcome", () -> sendWelcomeEmail(user));

    return true;
  }
}
// <end_here>
