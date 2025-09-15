package usecases.workflows;

import static usecases.workflows.utils.DomainModels.*;
import static usecases.workflows.utils.UserUtils.*;

import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Workflow;
import usecases.workflows.utils.UserServiceClient;

@Workflow
public class ExternalUserSignup {

  @Handler
  public SignupResult run(WorkflowContext ctx, User user) {
    String userId = ctx.key();

    // <start_here>
    // Move user DB interaction to dedicated service
    boolean success =
        UserServiceClient.fromContext(ctx).createUser(new CreateUserRequest(userId, user));
    if (!success) return new SignupResult(false);

    // Execute other steps inline
    ctx.run("activate", () -> activateUser(userId));
    ctx.run("welcome", () -> sendWelcomeEmail(user));
    // <end_here>

    return new SignupResult(true);
  }
}
