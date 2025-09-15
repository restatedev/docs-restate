package usecases.workflows.utils;

import static usecases.workflows.utils.DomainModels.*;

import dev.restate.sdk.Context;

public class UserServiceClient {
  private final Context ctx;

  private UserServiceClient(Context ctx) {
    this.ctx = ctx;
  }

  public static UserServiceClient fromContext(Context ctx) {
    return new UserServiceClient(ctx);
  }

  public boolean createUser(CreateUserRequest request) {
    // In a real implementation, this would make a Restate service call
    // For the example, we'll simulate the call
    System.out.println("Creating user " + request.userId);
    return true;
  }
}
