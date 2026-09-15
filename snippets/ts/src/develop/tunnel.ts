// <start_in_process_tunnel>
import { connectTunnel } from "@restatedev/restate-sdk-tunnel";
import { greeter } from "./greeter";

const connection = connectTunnel({
  region: process.env.RESTATE_CLOUD_REGION!,
  environmentId: process.env.RESTATE_ENVIRONMENT_ID!,
  authToken: process.env.RESTATE_AUTH_TOKEN!,
  signingPublicKey: process.env.RESTATE_SIGNING_PUBLIC_KEY!,
  tunnelName: process.env.RESTATE_TUNNEL_NAME!,
  services: [greeter],
});

connection.ready.then(() => {
  console.log(`Register this deployment: ${connection.deploymentUrl}`);
});
// <end_in_process_tunnel>
