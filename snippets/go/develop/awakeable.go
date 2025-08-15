package develop

import (
	"fmt"

	restate "github.com/restatedev/sdk-go"
)

type Awakeable struct{}

func (Awakeable) Greet(ctx restate.Context, name string) error {
	// <start_here>
	awakeable := restate.Awakeable[string](ctx)
	awakeableId := awakeable.Id()

	if _, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return requestHumanReview(awakeableId)
	}); err != nil {
		return err
	}

	review, err := awakeable.Result()
	if err != nil {
		return err
	}
	// <end_here>

	_ = review

	// <start_resolve>
	restate.ResolveAwakeable(ctx, awakeableId, "Looks good!")
	// <end_resolve>

	// <start_reject>
	restate.RejectAwakeable(ctx, awakeableId, fmt.Errorf("Cannot do review"))
	// <end_reject>

	return nil
}

func requestHumanReview(awakeableId string) (string, error) {
	return "123", nil
}
