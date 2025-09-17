import * as restate from "@restatedev/restate-sdk";

type BookingRequest = {
  customerId: string;
  flight: { flightId: string; passengerName: string };
  car: { pickupLocation: string; rentalDate: string };
  hotel: { arrivalDate: string; departureDate: string };
};

// <start_here>
const bookingWorkflow = restate.service({
  name: "BookingWorkflow",
  handlers: {
    run: async (ctx: restate.Context, req: BookingRequest) => {
      const { customerId, flight, car, hotel } = req;
      // create a list of undo actions
      const compensations = [];

      try {
        // Register rollback actions, for in case of failures
        compensations.push(() =>
          ctx.run(() => flightClient.cancel(customerId))
        );
        await ctx.run(() => flightClient.book(customerId, flight));

        compensations.push(() =>
          ctx.run(() => carRentalClient.cancel(customerId))
        );
        await ctx.run(() => carRentalClient.book(customerId, car));

        compensations.push(() => ctx.run(() => hotelClient.cancel(customerId)));
        await ctx.run(() => hotelClient.book(customerId, hotel));
      } catch (e) {
        // Terminal errors are not retried by Restate, so undo previous actions and fail the workflow
        if (e instanceof restate.TerminalError) {
          // Restate guarantees that all compensations are executed
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

const carRentalClient = {
  book: async (
    customerId: string,
    _req: { pickupLocation: string; rentalDate: string }
  ) => {
    console.info(`Car booked for customer ${customerId}`);
  },
  cancel: async (customerId: string) => {
    console.info(`Car cancelled for customer ${customerId}`);
  },
};

const flightClient = {
  book: async (
    customerId: string,
    _req: { flightId: string; passengerName: string }
  ) => {
    console.info(`Flight booked for customer ${customerId}`);
  },
  cancel: async (customerId: string) => {
    console.info(`Flight cancelled for customer ${customerId}`);
  },
};

const hotelClient = {
  book: async (
    customerId: string,
    _req: { arrivalDate: string; departureDate: string }
  ) => {
    console.error("[👻 SIMULATED] This hotel is fully booked!");
  },
  cancel: async (customerId: string) => {
    console.info(`Hotel cancelled for customer ${customerId}`);
  },
};
