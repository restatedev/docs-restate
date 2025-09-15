package usecases.microservices;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.util.ArrayList;
import java.util.List;
import usecases.microservices.utils.BookingRequest;
import usecases.microservices.utils.BookingResult;

@Service
public class BookingService {

  // <start_here>
  @Handler
  public BookingResult reserve(Context ctx, BookingRequest request) {
    List<Runnable> compensations = new ArrayList<>();

    try {
      // Reserve hotel
      compensations.add(() -> cancelHotel(request.hotelId));
      ctx.run("book-hotel", () -> bookHotel(request));

      // Reserve flight
      compensations.add(() -> cancelFlight(request.flightId));
      ctx.run("book-flight", () -> bookFlight(request));

      return new BookingResult(true);
    } catch (Exception error) {
      // Run compensations in reverse order
      for (Runnable compensation : compensations.reversed()) {
        ctx.run("compensation", compensation::run);
      }
      throw error;
    }
  }
  // <end_here>

  private Void cancelHotel(String hotelId) {
    // Simulate hotel cancellation
    return null;
  }

  private Void bookHotel(BookingRequest request) {
    // Simulate hotel booking
    return null;
  }

  private Void cancelFlight(String flightId) {
    // Simulate flight cancellation
    return null;
  }

  private Void bookFlight(BookingRequest request) {
    // Simulate flight booking
    return null;
  }
}
