package main

import (
	"context"
	"errors"
	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"log"
)

// <start_here>
type UserAccount struct{}

func (UserAccount) UpdateBalance(ctx restate.ObjectContext, amount float64) (float64, error) {
	balance, err := restate.Get[float64](ctx, "balance")
	if err != nil {
		return 0.0, err
	}

	newBalance := balance + amount
	if newBalance < 0.0 {
		return 0.0, restate.TerminalError(errors.New("insufficient funds"))
	}

	restate.Set(ctx, "balance", newBalance)
	return newBalance, nil
}

func (UserAccount) GetBalance(ctx restate.ObjectSharedContext) (float64, error) {
	return restate.Get[float64](ctx, "balance")
}

// <end_here>

func main() {
	if err := server.NewRestate().
		Bind(restate.Reflect(UserAccount{})).
		Start(context.Background(), ":9080"); err != nil {
		log.Fatal(err)
	}
}
