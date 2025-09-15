import * as restate from "@restatedev/restate-sdk";
import subscriptionService from "./basic_service";
import signupWorkflow from "./workflow";
import cartObject from "./object";

// <start_here>
restate.serve({
  services: [subscriptionService, cartObject, signupWorkflow],
  port: 9080,
});
// <end_here>
