package develop;

import dev.restate.sdk.testing.*;

// <start_extension>
@RestateTest
class MyServiceTest {

  @BindService MyService service = new MyService();

  // Your tests

}
// <end_extension>
