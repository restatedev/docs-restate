package usecases.microservices;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import java.util.ArrayList;
import java.util.Collections;
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
      Collections.reverse(compensations);
      for (Runnable compensation : compensations) {
        ctx.run("compensation", compensation::run);
      }
      throw error;
    }
  }

  // <end_here>

  private void cancelHotel(String hotelId) {
    // Simulate hotel cancellation
  }

  private void bookHotel(BookingRequest request) {
    // Simulate hotel booking
  }

  private void cancelFlight(String flightId) {
    // Simulate flight cancellation
  }

  private void bookFlight(BookingRequest request) {
    // Simulate flight booking
  }
}
