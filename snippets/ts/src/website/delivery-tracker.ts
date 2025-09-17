import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";

type Delivery = {
  locations: Location[];
};

class Location {}

// <start_here>
restate.object({
  name: "delivery-tracker",
  handlers: {
    handleLocationEvent: async (ctx: restate.ObjectContext, location: Location) => {
      const delivery = await ctx.get<Delivery>("delivery");
      if (!delivery) {
        throw new TerminalError(`Delivery not found`);
      }

      delivery.locations.push(location);
      ctx.set("delivery", delivery);
    },
    // ... other handlers ...
  },
});
// <end_here>
