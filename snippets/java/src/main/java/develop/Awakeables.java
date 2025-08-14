package develop;

import dev.restate.sdk.Awakeable;
import dev.restate.sdk.ObjectContext;

public class Awakeables {

  public void awakeables(ObjectContext ctx) {
    String name = "hello";
    // <start_here>
    // Create awakeable and get unique ID
    Awakeable<String> awakeable = ctx.awakeable(String.class);
    String awakeableId = awakeable.id();

    // Send ID to external system (email, queue, webhook, etc.)
    ctx.run(() -> requestHumanReview(name, awakeableId));

    // Handler suspends here until external completion
    String review = awakeable.await();
    // <end_here>

    // <start_resolve>
    // Complete with success data
    ctx.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");
    // <end_resolve>

    // <start_reject>
    // Complete with error
    ctx.awakeableHandle(awakeableId).reject("This cannot be reviewed.");
    // <end_reject>
  }

  public void requestHumanReview(String name, String awakeableId) {}
}
