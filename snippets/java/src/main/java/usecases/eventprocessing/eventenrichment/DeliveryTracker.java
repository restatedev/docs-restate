package usecases.eventprocessing.eventenrichment;

import dev.restate.sdk.Restate;
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
  public void register(Delivery packageInfo) {
    Restate.state().set(DELIVERY, packageInfo);
  }

  @Handler
  public void setLocation(Location location) {
    var delivery =
        Restate.state()
            .get(DELIVERY)
            .orElseThrow(() -> new TerminalException("Delivery not found"));

    delivery.addLocation(location);
    Restate.state().set(DELIVERY, delivery);
  }

  @Shared
  public Delivery getDelivery() {
    return Restate.state()
        .get(DELIVERY)
        .orElseThrow(() -> new TerminalException("Delivery not found"));
  }
}
// <end_here>
