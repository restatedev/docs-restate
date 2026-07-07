package foundations.services;

import static foundations.services.WorkflowHelpers.createUserEntry;
import static foundations.services.WorkflowHelpers.sendVerificationEmail;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;

record User(String email, String name) {}

record ClickRequest(String secret) {}

class WorkflowHelpers {
  public static void createUserEntry(String userId, User user) {
    System.out.printf(">>> Creating user entry for %s (%s)\n", user.name(), user.email());
  }

  public static void sendVerificationEmail(User user, String secret) {
    System.out.printf(
        ">>> Sending verification email to %s with secret %s\n", user.email(), secret);
  }
}

// <start_here>
@Workflow
public class SignupWorkflow {
  private static final DurablePromiseKey<String> EMAIL_LINK_CLICKED =
      DurablePromiseKey.of("email-link-clicked", String.class);

  @Workflow
  public boolean run(User user) {
    // workflow ID = user ID; workflow runs once per user
    String userId = Restate.key();

    Restate.run("createUserEntry", () -> createUserEntry(userId, user));

    String secret = Restate.random().nextUUID().toString();
    Restate.run("sendVerificationEmail", () -> sendVerificationEmail(user, secret));

    String clickSecret = Restate.promise(EMAIL_LINK_CLICKED).future().await();
    return clickSecret.equals(secret);
  }

  @Shared
  public void click(ClickRequest request) {
    Restate.promiseHandle(EMAIL_LINK_CLICKED).resolve(request.secret());
  }
}
// <end_here>
