package usecases.eventprocessing.eventtransactions;

import static usecases.eventprocessing.eventtransactions.utils.Stubs.*;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import java.time.Duration;
import usecases.eventprocessing.eventtransactions.utils.SocialMediaPost;

// <start_here>
@VirtualObject
public class UserFeed {
  @Handler
  public void processPost(SocialMediaPost post) {
    String userId = Restate.key();

    String postId = Restate.run("create-post", String.class, () -> createPost(userId, post));

    while (Restate.run("get-post-status", String.class, () -> getPostStatus(postId))
        .equals("PENDING")) {
      Restate.sleep(Duration.ofSeconds(5));
    }

    Restate.run("update-user-feed", () -> updateUserFeed(userId, postId));
  }
}
// <end_here>
