package usecases.eventprocessing.eventtransactions;

import static usecases.eventprocessing.eventtransactions.utils.Stubs.*;

import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import java.time.Duration;
import usecases.eventprocessing.eventtransactions.utils.SocialMediaPost;

// <start_here>
@VirtualObject
public class UserFeed {
  @Handler
  public void processPost(ObjectContext ctx, SocialMediaPost post) {
    String userId = ctx.key();

    String postId = ctx.run(String.class, () -> createPost(userId, post));

    while (ctx.run(String.class, () -> getPostStatus(postId)).equals("PENDING")) {
      ctx.sleep(Duration.ofSeconds(5));
    }

    ctx.run(() -> updateUserFeed(userId, postId));
  }
}
// <end_here>
