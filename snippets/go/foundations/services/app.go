package main

import (
	"context"
	"log"

	"github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
)

// <start_here>
func main() {
	if err := server.NewRestate().
		Bind(restate.Reflect(SubscriptionService{})).
		Bind(restate.Reflect(ShoppingCartObject{})).
		Bind(restate.Reflect(SignupWorkflow{})).
		Start(context.Background(), ":9080"); err != nil {
		log.Fatal(err)
	}
}

// <end_here>
