package usecases.workflows;

import static usecases.workflows.utils.DomainModels.*;
import static usecases.workflows.utils.UserUtils.*;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Workflow;

// <start_here>
@Workflow
public class UserSignup {

  @Workflow
  public boolean run(User user) {
    String userId = Restate.key(); // unique workflow key

    // Use regular if/else, loops, and functions
    boolean success = Restate.run("create", Boolean.class, () -> createUser(userId, user));
    if (!success) {
      return false;
    }

    // Execute durable steps
    Restate.run("activate", () -> activateUser(userId));
    Restate.run("welcome", () -> sendWelcomeEmail(user));

    return true;
  }
}
// <end_here>
