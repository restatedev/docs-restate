package guides.sagas;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.endpoint.Endpoint;
import dev.restate.sdk.http.vertx.RestateHttpServer;
import guides.sagas.clients.CarRentalClient;
import guides.sagas.clients.FlightClient;
import guides.sagas.clients.PaymentClient;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookingWorkflow {

  public record BookingRequest(
      FlightClient.FlightBookingRequest flight,
      CarRentalClient.CarRentalRequest car,
      PaymentClient.PaymentInfo paymentInfo) {}

  @Handler
  public void run(BookingRequest req) throws TerminalException {
    var flight = req.flight;
    var paymentInfo = req.paymentInfo;
    List<Runnable> compensations = new ArrayList<>();

    // <start_twostep>
    String bookingId =
        Restate.run("reserve-flight", String.class, () -> FlightClient.reserve(flight));
    compensations.add(() -> Restate.run("cancel-flight", () -> FlightClient.cancel(bookingId)));

    // ... do other work, like reserving a car, etc. ...

    Restate.run("confirm-flight", () -> FlightClient.confirm(bookingId));
    // <end_twostep>

    // <start_idempotency>
    String paymentId = Restate.random().nextUUID().toString();
    compensations.add(() -> Restate.run("refund-payment", () -> PaymentClient.refund(paymentId)));
    Restate.run("charge-payment", () -> PaymentClient.charge(paymentInfo, paymentId));
    // <end_idempotency>
  }

  public static void main(String[] args) {
    RestateHttpServer.listen(Endpoint.bind(new BookingWorkflow()));
  }
}
