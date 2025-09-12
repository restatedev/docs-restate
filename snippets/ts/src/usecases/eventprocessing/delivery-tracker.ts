import * as restate from "@restatedev/restate-sdk";
import { handlers, TerminalError } from "@restatedev/restate-sdk";
import shared = handlers.object.shared;

type Delivery = {
  locations: Location[];
};

class Location {}

// <start_here>
export default restate.object({
  name: "delivery-tracker",
  handlers: {
    register: async (ctx: restate.ObjectContext, delivery: Delivery) =>
      ctx.set("delivery", delivery),

    setLocation: async (ctx: restate.ObjectContext, location: Location) => {
      const delivery = await ctx.get<Delivery>("delivery");
      if (!delivery) {
        throw new TerminalError(`Delivery not found`);
      }

      delivery.locations.push(location);
      ctx.set("delivery", delivery);
    },

    getDelivery: shared(async (ctx: restate.ObjectSharedContext) =>
      ctx.get<Delivery>("delivery")
    ),
  },
});
// <end_here>
