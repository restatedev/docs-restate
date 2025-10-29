package eventprocessing

import (
	restate "github.com/restatedev/sdk-go"
	"time"
)

type SocialMediaPost struct {
	Content  string `json:"content"`
	Metadata string `json:"metadata"`
}

// <start_here>
type UserFeed struct{}

func (UserFeed) ProcessPost(ctx restate.ObjectContext, post SocialMediaPost) error {
	var userId = restate.Key(ctx)

	postId, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
		return CreatePost(userId, post)
	})
	if err != nil {
		return err
	}

	for {
		status, err := restate.Run(ctx, func(ctx restate.RunContext) (string, error) {
			return GetPostStatus(postId), nil
		})
		if err != nil {
			return err
		}
		if status != PENDING {
			break
		}
		if err = restate.Sleep(ctx, 5*time.Second); err != nil {
			// </mark_2>
			return err
		}
	}

	if _, err := restate.Run(ctx, func(ctx restate.RunContext) (restate.Void, error) {
		return UpdateUserFeed(userId, postId)
	}); err != nil {
		return err
	}

	return nil
}

// <end_here>
