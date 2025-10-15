import * as clients from "@restatedev/restate-sdk-clients";
import {MyService} from "../my_service";

async function callService() {
    // <start_here>
    const restateClient = clients.connect({url: "http://localhost:8080"});

    // Request-response
    const result = await restateClient
        .serviceClient<MyService>({name: "MyService"})
        .myHandler("Hi");

    // One-way
    await restateClient
        .serviceSendClient<MyService>({name: "MyService"})
        .myHandler("Hi");

    // Delayed
    await restateClient
        .serviceSendClient<MyService>({name: "MyService"})
        .myHandler("Hi", clients.rpc.sendOpts({delay: {seconds: 1}}));

    // <end_here>
}