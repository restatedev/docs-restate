package usecases.eventprocessing.eventenrichment;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.SharedObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import usecases.eventprocessing.eventenrichment.types.Delivery;
import usecases.eventprocessing.eventenrichment.types.Location;

// <start_here>
@VirtualObject
public class DeliveryTracker {
  private static final StateKey<Delivery> DELIVERY = StateKey.of("delivery", Delivery.class);

  @Handler
  public void register(ObjectContext ctx, Delivery packageInfo) {
    ctx.set(DELIVERY, packageInfo);
  }

  @Handler
  public void setLocation(ObjectContext ctx, Location location) {
    var delivery = ctx.get(DELIVERY).orElseThrow(() -> new TerminalException("Delivery not found"));

    delivery.addLocation(location);
    ctx.set(DELIVERY, delivery);
  }

  @Shared
  public Delivery getDelivery(SharedObjectContext ctx) {
    return ctx.get(DELIVERY).orElseThrow(() -> new TerminalException("Delivery not found"));
  }
}
// <end_here>
