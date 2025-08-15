package develop

import dev.restate.sdk.testing.BindService
import dev.restate.sdk.testing.RestateTest

// <start_extension>
@RestateTest
class MyServiceTest {

  @BindService val service = MyService()

  // Your tests

}
// <end_extension>
