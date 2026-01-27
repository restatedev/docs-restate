import * as clients from "@restatedev/restate-sdk-clients";
import { MyAgent } from "./my_agent";

async function callAgent() {
  // <start_here>
  // import * as clients from "@restatedev/restate-sdk-clients";
  // import {MyAgent} from "./my_agent";

  const ingress = clients.connect({ url: "http://localhost:8080" });

  // Send a message without waiting for completion
  const handle = await ingress
    .serviceSendClient<MyAgent>({ name: "my-agent" })
    .run({ message: "How are you?" });
  // <end_here>
}
