package develop

import restate "github.com/restatedev/sdk-go"

// <start_one_shot>
func waitForApproval(ctx restate.Context) (bool, error) {
	return restate.Signal[bool](ctx, "approval").Result()
}

// <end_one_shot>

// <start_wait>
func reviseUntilDone(ctx restate.Context, topic string) (string, error) {
	draft := "Research notes for " + topic

	for {
		// Each call waits for the next resolution of the named signal.
		text, err := restate.Signal[string](ctx, "steer").Result()
		if err != nil {
			return "", err
		}
		if text == "done" {
			return draft, nil
		}
		draft += "\n" + text
	}
}

// <end_wait>

// <start_resolve>
func steerInvocation(ctx restate.Context, invocationID string, text string) {
	restate.ResolveSignal(ctx, invocationID, "steer", text)
}

// <end_resolve>
