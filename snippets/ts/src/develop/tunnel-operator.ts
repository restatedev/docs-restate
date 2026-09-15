// <start_operator_in_process_tunnel>
import { connectTunnel } from "@restatedev/restate-sdk-tunnel";
import { greeter } from "./greeter";

connectTunnel({ services: [greeter] });
// <end_operator_in_process_tunnel>
