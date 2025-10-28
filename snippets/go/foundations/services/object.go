package main

import (
	restate "github.com/restatedev/sdk-go"
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
