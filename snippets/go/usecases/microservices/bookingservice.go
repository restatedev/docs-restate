package main

import (
	restate "github.com/restatedev/sdk-go"
)

type BookingRequest struct {
	HotelID  string `json:"hotel_id"`
	FlightID string `json:"flight_id"`
}

type BookingResult struct {
	Success bool `json:"success"`
}

func CancelHotel(hotelID string) error {
	// Simulate hotel cancellation
	return nil
}

func BookHotel(request BookingRequest) error {
	// Simulate hotel booking
	return nil
}

func CancelFlight(flightID string) error {
	// Simulate flight cancellation
	return nil
}

func BookFlight(request BookingRequest) error {
	// Simulate flight booking
	return nil
}

// <start_here>
type BookingService struct{}

func (BookingService) Reserve(ctx restate.Context, request BookingRequest) (BookingResult, error) {
	var compensations []func() error

	defer func() {
		if r := recover(); r != nil {
			// Run compensations in reverse order
			for i := len(compensations) - 1; i >= 0; i-- {
				restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
					compensations[i]()
					return restate.Void{}, nil
				})
			}
			panic(r)
		}
	}()

	// Reserve hotel
	compensations = append(compensations, func() error { return CancelHotel(request.HotelID) })
	_, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return restate.Void{}, BookHotel(request)
	})
	if err != nil {
		// Run compensations in reverse order
		for i := len(compensations) - 1; i >= 0; i-- {
			restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
				compensations[i]()
				return restate.Void{}, nil
			})
		}
		return BookingResult{}, err
	}

	// Reserve flight
	compensations = append(compensations, func() error { return CancelFlight(request.FlightID) })
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return restate.Void{}, BookFlight(request)
	})
	if err != nil {
		// Run compensations in reverse order
		for i := len(compensations) - 1; i >= 0; i-- {
			restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
				compensations[i]()
				return restate.Void{}, nil
			})
		}
		return BookingResult{}, err
	}

	return BookingResult{Success: true}, nil
}

// <end_here>
