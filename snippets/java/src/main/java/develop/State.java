package develop;

import dev.restate.sdk.Restate;
import dev.restate.sdk.common.StateKey;
import java.util.Collection;

public class State {
  public void getState() {

    // <start_statekeys>
    Collection<String> keys = Restate.state().getAllKeys();
    // <end_statekeys>

    // <start_get>
    // Getting String value
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    String stringState = Restate.state().get(STRING_STATE_KEY).orElse("my-default");

    // Getting integer value
    StateKey<Integer> INT_STATE_KEY = StateKey.of("my-key", Integer.class);
    int intState = Restate.state().get(INT_STATE_KEY).orElse(0);
    // <end_get>
  }

  public void setState() {
    // <start_set>
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    Restate.state().set(STRING_STATE_KEY, "my-new-value");
    // <end_set>

  }

  public void clearState() {
    // <start_clear>
    StateKey<String> STRING_STATE_KEY = StateKey.of("my-key", String.class);
    Restate.state().clear(STRING_STATE_KEY);
    // <end_clear>

    // <start_clear_all>
    Restate.state().clearAll();
    // <end_clear_all>
  }
}
