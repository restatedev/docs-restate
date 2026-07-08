package foundations.actions;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;

// Example Virtual Object that demonstrates state actions
@VirtualObject
public class StateExample {
  public record MyRequest(String date) {}

  private static final StateKey<UserProfile> PROFILE = StateKey.of("profile", UserProfile.class);
  private static final StateKey<Integer> COUNT = StateKey.of("count", Integer.class);
  private static final StateKey<ShoppingCart> CART = StateKey.of("cart", ShoppingCart.class);
  private static final StateKey<String> LAST_LOGIN = StateKey.of("lastLogin", String.class);

  @Handler
  public void stateGetExample() {
    // <start_state_get>
    // Get with type and default value
    UserProfile profile = Restate.state().get(PROFILE).orElse(null);
    int count = Restate.state().get(COUNT).orElse(0);
    ShoppingCart cart = Restate.state().get(CART).orElse(new ShoppingCart());
    // <end_state_get>
  }

  @Handler
  public void stateSetExample(MyRequest request) {
    var count = 1;
    // <start_state_set>
    // Store simple values
    Restate.state().set(COUNT, count + 1);
    Restate.state().set(LAST_LOGIN, request.date());

    // Store complex objects
    Restate.state().set(PROFILE, new UserProfile("John Doe", "john@example.com"));
    // <end_state_set>
  }

  @Handler
  public void stateClearExample() {
    // <start_state_clear>
    // Clear specific keys
    Restate.state().clear(StateKey.of("shoppingCart", ShoppingCart.class));
    Restate.state().clear(StateKey.of("sessionToken", String.class));

    // Clear all user data
    Restate.state().clearAll();
    // <end_state_clear>
  }
}
