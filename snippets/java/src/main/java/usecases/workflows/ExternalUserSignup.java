package usecases.workflows;

import static usecases.workflows.utils.DomainModels.*;
import static usecases.workflows.utils.UserUtils.*;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Workflow;
import usecases.workflows.utils.UserService;

@Workflow
public class ExternalUserSignup {

  @Workflow
  public SignupResult run(User user) {
    String userId = Restate.key();

    // <start_here>
    // Move user DB interaction to dedicated service
    boolean success =
        Restate.serviceHandle(UserService.class)
            .call(UserService::createUser, new CreateUserRequest(userId, user))
            .await();
    if (!success) return new SignupResult(false);

    // Execute other steps inline
    Restate.run("activate", () -> activateUser(userId));
    Restate.run("welcome", () -> sendWelcomeEmail(user));
    // <end_here>

    return new SignupResult(true);
  }
}
