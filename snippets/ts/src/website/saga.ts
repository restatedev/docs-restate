import * as restate from "@restatedev/restate-sdk";
import {bookFlight, bookHotel, cancelFlight, cancelHotel} from "./utils";

type BookingRequest = {
  customerId: string;
  flight: { flightId: string; passengerName: string };
  hotel: { arrivalDate: string; departureDate: string };
};

// <start_here>
restate.service({
  name: "BookingWorkflow",
  handlers: {
    run: async (ctx: restate.Context, req: BookingRequest) => {
      const { customerId, flight, hotel } = req;
      // create a list of undo actions
      const compensations = [];

      try {
        // Register rollback actions, for in case of failures
        compensations.push(() => ctx.run(() => cancelFlight(customerId)));
        await ctx.run(() => bookFlight(customerId, flight));

        compensations.push(() => ctx.run(() => cancelHotel(customerId)));
        await ctx.run(() => bookHotel(customerId, hotel));
      } catch (e) {
        // Undo previous actions
        // Restate guarantees that all compensations are executed
        if (e instanceof restate.TerminalError) {
          for (const compensation of compensations.reverse()) {
            await compensation();
          }
        }
        throw e;
      }
    },
  },
});
// <end_here>