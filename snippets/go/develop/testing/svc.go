package testing

import (
	"fmt"

	restate "github.com/restatedev/sdk-go"
)

// <start_here>
type Greeter struct{}

func (Greeter) Greet(ctx restate.Context, req string) (string, error) {
	return fmt.Sprintf("Hello %s!", req), nil
}

// <end_here>
