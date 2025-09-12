import * as restate from "@restatedev/restate-sdk";

function cancelHotel(hotelId: any) {
  return undefined;
}

function bookHotel(request: BookingRequest) {
  return undefined;
}

function cancelFlight(flightId: string) {
  return undefined;
}

function bookFlight(request: BookingRequest) {
  return undefined;
}

type BookingRequest = {
  hotelId: string;
  flightId: string;
};

// <start_here>
export default restate.service({
  name: "BookingService",
  handlers: {
    reserve: async (ctx: restate.Context, request: BookingRequest) => {
      const compensations = [];

      try {
        // Reserve hotel
        compensations.push(() => cancelHotel(request.hotelId));
        await ctx.run(() => bookHotel(request));

        // Reserve flight
        compensations.push(() => cancelFlight(request.flightId));
        await ctx.run(() => bookFlight(request));

        return { success: true };
      } catch (error) {
        // Run compensations in reverse order
        for (const compensation of compensations.reverse()) {
          await ctx.run(() => compensation());
        }
        throw error;
      }
    },
  },
});
// <end_here>
