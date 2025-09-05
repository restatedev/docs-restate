package main

import (
	"context"
	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"log"
)

type Item struct {
	ProductId string  `json:"productId"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

// <start_here>
type ShoppingCartObject struct{}

func (ShoppingCartObject) AddItem(ctx restate.ObjectContext, item Item) ([]Item, error) {
	items, err := restate.Get[[]Item](ctx, "items")
	if err != nil {
		return nil, err
	}
	items = append(items, item)
	restate.Set(ctx, "items", items)
	return items, nil
}

func (ShoppingCartObject) GetTotal(ctx restate.ObjectSharedContext) (float64, error) {
	items, err := restate.Get[[]Item](ctx, "items")
	if err != nil {
		return 0, err
	}
	total := 0.0
	for _, item := range items {
		total += item.Price * float64(item.Quantity)
	}
	return total, nil
}

// <end_here>
func main() {
	if err := server.NewRestate().
		Bind(restate.Reflect(ShoppingCartObject{})).
		Start(context.Background(), ":9080"); err != nil {
		log.Fatal(err)
	}
}
