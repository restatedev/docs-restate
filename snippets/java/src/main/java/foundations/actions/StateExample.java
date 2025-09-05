package foundations.actions;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import develop.MyObject;

// Example Virtual Object that demonstrates state actions
@VirtualObject
public class StateExample {
  public record MyRequest(String date) {}
  private static final StateKey<UserProfile> PROFILE = StateKey.of("profile", UserProfile.class);
  private static final StateKey<Integer> COUNT = StateKey.of("count", Integer.class);
  private static final StateKey<ShoppingCart> CART = StateKey.of("cart", ShoppingCart.class);
  private static final StateKey<String> LAST_LOGIN = StateKey.of("lastLogin", String.class);

  @Handler
  public void stateGetExample(ObjectContext ctx) {
    // <start_state_get>
    // Get with type and default value
    UserProfile profile = ctx.get(PROFILE).orElse(null);
    int count = ctx.get(COUNT).orElse(0);
    ShoppingCart cart = ctx.get(CART).orElse(new ShoppingCart());
    // <end_state_get>
  }

  @Handler
  public void stateSetExample(ObjectContext ctx, MyRequest request) {
    var count = 1;
    // <start_state_set>
    // Store simple values
    ctx.set(COUNT, count + 1);
    ctx.set(LAST_LOGIN, request.date());

    // Store complex objects
    ctx.set(PROFILE, new UserProfile("John Doe", "john@example.com"));
    // <end_state_set>
  }

  @Handler
  public void stateClearExample(ObjectContext ctx) {
    // <start_state_clear>
    // Clear specific keys
    ctx.clear(StateKey.of("shoppingCart", ShoppingCart.class));
    ctx.clear(StateKey.of("sessionToken", String.class));

    // Clear all user data
    ctx.clearAll();
    // <end_state_clear>
  }
}
