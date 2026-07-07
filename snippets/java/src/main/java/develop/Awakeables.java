package develop;

import dev.restate.sdk.Awakeable;
import dev.restate.sdk.Restate;

public class Awakeables {

  public void awakeables() {
    String name = "hello";
    // <start_here>
    // Create awakeable and get unique ID
    Awakeable<String> awakeable = Restate.awakeable(String.class);
    String awakeableId = awakeable.id();

    // Send ID to external system (email, queue, webhook, etc.)
    Restate.run("request-human-review", () -> requestHumanReview(name, awakeableId));

    // Handler suspends here until external completion
    String review = awakeable.await();
    // <end_here>

    // <start_resolve>
    // Complete with success data
    Restate.awakeableHandle(awakeableId).resolve(String.class, "Looks good!");
    // <end_resolve>

    // <start_reject>
    // Complete with error
    Restate.awakeableHandle(awakeableId).reject("This cannot be reviewed.");
    // <end_reject>
  }

  public void requestHumanReview(String name, String awakeableId) {}
}
