package foundations.functions;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

record MyInput() {}

record ProcessingResult(boolean success, String result) {}

@Service
class Functions {
  public ProcessingResult processData(MyInput input) {
    return new ProcessingResult(true, "Processed");
  }

  // <start_here>
  @Handler
  public ProcessingResult myHandler(Context ctx, MyInput myInput) {
    return ctx.run(ProcessingResult.class, () -> processData(myInput));
  }
  // <end_here>
}
