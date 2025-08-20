import * as restate from "@restatedev/restate-sdk";
import subscriptionService from "./basic_service";
import signupWorkflow from "./workflow";
import cartObject from "./object";

// <start_here>
restate
  .endpoint()
  .bind(subscriptionService)
  .bind(cartObject)
  .bind(signupWorkflow)
  .listen(9080);
// <end_here>
