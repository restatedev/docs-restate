package foundations.actions;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;

@VirtualObject
public class ShoppingCartObject {
  @Handler
  public void emptyExpiredCart(ObjectContext ctx) {
    // Implementation
  }
}
