package develop

import (
	"fmt"

	restate "github.com/restatedev/sdk-go"
)

type ErrorHanding struct{}

func (ErrorHanding) Greet(ctx restate.Context, name string) error {
	// <start_here>
	return restate.ToTerminalError(fmt.Errorf("Something went wrong."), restate.WithErrorCode(500))
	// <end_here>
}

func terminalErrorCode(err error) restate.Code {
	// <start_terminal_downcast>
	if terminalErr := restate.AsTerminalError(err); terminalErr != nil {
		return terminalErr.Code()
	}
	// <end_terminal_downcast>
	return 0
}

func retryableError() error {
	// <start_retryable>
	return restate.ToRetryableError(
		fmt.Errorf("rate limited by upstream"),
		restate.WithErrorCode(429),
	)
	// <end_retryable>
}

func retryableErrorCode(err error) restate.Code {
	// <start_retryable_downcast>
	if retryableErr := restate.AsRetryableError(err); retryableErr != nil {
		return retryableErr.Code()
	}
	// <end_retryable_downcast>
	return 0
}
