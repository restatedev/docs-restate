package foundations.actions;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;

@VirtualObject
public class UserAccount {
  @Handler
  public UserProfile getProfile(ObjectContext ctx) {
    return new UserProfile("John", "john@example.com");
  }
}
