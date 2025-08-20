import * as restate from "@restatedev/restate-sdk";
import { flightClient, paymentClient } from "./clients/flight_client";

type BookingRequest = {
  customerId: string;
  flight: { flightId: string; passengerName: string };
  paymentInfo: string;
};

const bookingWorkflow = restate.service({
  name: "BookingWorkflow",
  handlers: {
    run: async (ctx: restate.Context, req: BookingRequest) => {
      const { customerId, flight, paymentInfo } = req;

      // create a list of undo actions
      const compensations = [];

      // <start_twostep>
      const bookingId = await ctx.run(() => flightClient.reserve(customerId, flight));
      compensations.push(() => ctx.run(() => flightClient.cancel(bookingId)));

      // ... do other work, like reserving a car, etc. ...

      await ctx.run(() => flightClient.confirm(bookingId));
      // <end_twostep>

      // <start_idempotency>
      const paymentId = ctx.rand.uuidv4();
      compensations.push(() => ctx.run(() => paymentClient.refund(paymentId)));
      await ctx.run(() => paymentClient.charge(paymentInfo, paymentId));
      // <end_idempotency>
    },
  },
});

restate.endpoint().bind(bookingWorkflow).listen(9080);
