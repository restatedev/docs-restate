package develop

import (
	"fmt"

	restate "github.com/restatedev/sdk-go"
)

type ErrorHanding struct{}

func (ErrorHanding) Greet(ctx restate.Context, name string) error {
	// <start_here>
	return restate.TerminalError(fmt.Errorf("invalid credit card"))
	// <end_here>
}
