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
export const bookingService = restate.service({
  name: "BookingService",
  handlers: {
    reserve: async (ctx: restate.Context, request: BookingRequest) => {
      const compensations = [];

      try {
        // Reserve hotel
        compensations.push(() =>
          ctx.run("cancel-hotel", () => cancelHotel(request.hotelId))
        );
        await ctx.run("book-hotel", () => bookHotel(request));

        // Reserve flight
        compensations.push(() =>
          ctx.run("cancel-flight", () => cancelFlight(request.flightId))
        );
        await ctx.run("book-flight", () => bookFlight(request));

        return { success: true };
      } catch (error) {
        // Run compensations in reverse order
        for (const compensation of compensations.reverse()) {
          await compensation();
        }
        throw error;
      }
    },
  },
});
// <end_here>
