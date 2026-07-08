package usecases.workflows.utils;

import static usecases.workflows.utils.DomainModels.*;

import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class UserService {
  @Handler
  public boolean createUser(CreateUserRequest req) {
    // Simulate DB call
    System.out.println("Creating user " + req.userId);
    return true;
  }
}
