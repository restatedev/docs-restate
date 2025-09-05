package foundations.services;

import static foundations.services.WorkflowHelpers.createUserEntry;
import static foundations.services.WorkflowHelpers.sendVerificationEmail;

import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
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
  public boolean run(WorkflowContext ctx, User user) {
    // workflow ID = user ID; workflow runs once per user
    String userId = ctx.key();

    ctx.run(() -> createUserEntry(userId, user));

    String secret = ctx.random().nextUUID().toString();
    ctx.run(() -> sendVerificationEmail(user, secret));

    String clickSecret = ctx.promise(EMAIL_LINK_CLICKED).future().await();
    return clickSecret.equals(secret);
  }

  @Shared
  public void click(SharedWorkflowContext ctx, ClickRequest request) {
    ctx.promiseHandle(EMAIL_LINK_CLICKED).resolve(request.secret());
  }
}
// <end_here>
