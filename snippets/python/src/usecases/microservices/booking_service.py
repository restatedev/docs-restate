import restate


class BookingRequest:
    def __init__(self, hotel_id: str, flight_id: str):
        self.hotel_id = hotel_id
        self.flight_id = flight_id


def cancel_hotel(hotel_id: str):
    # Simulate hotel cancellation
    pass


def book_hotel(request: BookingRequest):
    # Simulate hotel booking
    pass


def cancel_flight(flight_id: str):
    # Simulate flight cancellation
    pass


def book_flight(request: BookingRequest):
    # Simulate flight booking
    pass


booking_service = restate.Service("BookingService")


# <start_here>
@booking_service.handler()
async def reserve(ctx: restate.Context, request: BookingRequest):
    compensations = []

    try:
        # Reserve hotel
        compensations.append(lambda: cancel_hotel(request.hotel_id))
        await ctx.run_typed("book_hotel", book_hotel, request=request)

        # Reserve flight
        compensations.append(lambda: cancel_flight(request.flight_id))
        await ctx.run_typed("book_flight", book_flight, request=request)

        return {"success": True}
    except Exception as error:
        # Run compensations in reverse order
        for i, compensation in enumerate(reversed(compensations)):
            await ctx.run_typed(f"compensation_{i}", compensation)
        raise error


# <end_here>
