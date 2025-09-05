package foundations.services;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.SharedObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import java.util.ArrayList;
import java.util.List;

record Item(String productId, int quantity, double price) {}

record Cart(List<Item> items) {
  public Cart() {
    this(new ArrayList<>());
  }

  public Cart addItem(Item item) {
    var updatedItems = new ArrayList<>(items);
    updatedItems.add(item);
    return new Cart(updatedItems);
  }

  public double getTotalPrice() {
    return items.stream()
        .reduce(0.0, (sum, item) -> sum + item.price() * item.quantity(), Double::sum);
  }
}

// <start_here>
@VirtualObject
public class ShoppingCartObject {
  private static final StateKey<Cart> CART = StateKey.of("cart", Cart.class);

  @Handler
  public Cart addItem(ObjectContext ctx, Item item) {
    var cart = ctx.get(CART).orElse(new Cart());
    var newCart = cart.addItem(item);
    ctx.set(CART, newCart);
    return cart;
  }

  @Shared
  public double getTotal(SharedObjectContext ctx) {
    var cart = ctx.get(CART).orElse(new Cart());
    return cart.getTotalPrice();
  }
}
// <end_here>
