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

func BookHotel(request BookingRequest) (restate.Void, error) {
	// Simulate hotel booking
	return restate.Void{}, nil
}

func CancelFlight(flightID string) error {
	// Simulate flight cancellation
	return nil
}

func BookFlight(request BookingRequest) (restate.Void, error) {
	// Simulate flight booking
	return restate.Void{}, nil
}

// <start_here>
type BookingService struct{}

func (BookingService) Reserve(ctx restate.Context, request BookingRequest) (res BookingResult, err error) {
	var compensations []func() error
	defer func() {
		if err != nil {
			for i := len(compensations) - 1; i >= 0; i-- {
				_, compErr := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
					return restate.Void{}, compensations[i]()
				})
				if compErr != nil {
					err = compErr
				}
			}
		}
	}()

	// Reserve hotel
	compensations = append(compensations, func() error { return CancelHotel(request.HotelID) })
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return BookHotel(request)
	})
	if err != nil {
		return BookingResult{}, err
	}

	// Reserve flight
	compensations = append(compensations, func() error { return CancelFlight(request.FlightID) })
	_, err = restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return BookFlight(request)
	})
	if err != nil {
		return BookingResult{}, err
	}

	return BookingResult{Success: true}, nil
}

// <end_here>
