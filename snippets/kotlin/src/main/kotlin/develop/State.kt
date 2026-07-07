// Suppressing notifications about the naming of the state keys: not lower case
@file:Suppress("ktlint:standard:property-naming")

package develop

import dev.restate.sdk.kotlin.*

class State {
  suspend fun getState() {
    // <start_statekeys>
    val keys = state().keys()
    // <end_statekeys>

    // <start_get>
    // Getting String value
    val STRING_STATE_KEY = stateKey<String>("my-key")
    val stringState: String? = state().get(STRING_STATE_KEY)

    // Getting integer value
    val INT_STATE_KEY = stateKey<Int>("my-key")
    val intState: Int? = state().get(INT_STATE_KEY)
    // <end_get>
  }

  suspend fun setState() {
    // <start_set>
    val STRING_STATE_KEY = stateKey<String>("my-key")
    state().set(STRING_STATE_KEY, "my-new-value")
    // <end_set>
  }

  suspend fun clearState() {
    // <start_clear>
    val STRING_STATE_KEY = stateKey<String>("my-key")
    state().clear(STRING_STATE_KEY)
    // <end_clear>

    // <start_clear_all>
    state().clearAll()
    // <end_clear_all>
  }
}
