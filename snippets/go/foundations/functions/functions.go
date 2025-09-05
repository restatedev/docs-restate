package functions

import (
	restate "github.com/restatedev/sdk-go"
)

type MyInput struct{}
type ProcessingResult struct {
	Success bool
	Result  interface{}
}

func processData(input MyInput) (ProcessingResult, error) {
	return ProcessingResult{}, nil
}

// <start_here>
func MyHandler(ctx restate.Context, input MyInput) (ProcessingResult, error) {
	return restate.Run(ctx, func(ctx restate.RunContext) (ProcessingResult, error) {
		return processData(input)
	})
}

// <end_here>
