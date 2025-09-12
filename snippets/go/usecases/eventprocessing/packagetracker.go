package main

import (
	"context"
	"errors"
	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"log"
)

type Location struct {
	Timestamp string `json:"timestamp"`
	Location  string `json:"location"`
}

type Delivery struct {
	FinalDestination string     `json:"finalDestination"`
	Locations        []Location `json:"locations"`
}

// <start_here>
type DeliveryTracker struct{}

func (DeliveryTracker) Register(ctx restate.ObjectContext, delivery Delivery) error {
	restate.Set[Delivery](ctx, "delivery", delivery)
	return nil
}

func (DeliveryTracker) SetLocation(ctx restate.ObjectContext, location Location) error {
	packageInfo, err := restate.Get[*Delivery](ctx, "delivery")
	if err != nil {
		return err
	}
	if packageInfo == nil {
		return restate.TerminalError(errors.New("delivery not found"))
	}

	packageInfo.Locations = append(packageInfo.Locations, location)
	restate.Set[Delivery](ctx, "delivery", *packageInfo)
	return nil
}

func (DeliveryTracker) GetDelivery(ctx restate.ObjectSharedContext) (*Delivery, error) {
	return restate.Get[*Delivery](ctx, "delivery")
}

// <end_here>

func main() {
	if err := server.NewRestate().
		Bind(restate.Reflect(DeliveryTracker{})).
		Start(context.Background(), ":9080"); err != nil {
		log.Fatal(err)
	}
}
