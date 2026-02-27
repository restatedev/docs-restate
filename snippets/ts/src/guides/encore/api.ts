import { api } from "encore.dev/api";
import { createEndpointHandler } from "@restatedev/restate-sdk/fetch";
import { orderProcessor } from "./restate";

const handler = createEndpointHandler({
    services: [orderProcessor],
});

// Catch-all raw endpoint that Restate Server calls into
export const restateEndpoint = api.raw(
    { expose: true, path: "/restate/!rest", method: "*" },
    async (req, resp) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
        const body =
            req.method !== "GET" && req.method !== "HEAD"
                ? await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = [];
                    req.on("data", (chunk: Buffer) => chunks.push(chunk));
                    req.on("end", () => resolve(Buffer.concat(chunks)));
                    req.on("error", reject);
                })
                : undefined;

        const webReq = new Request(url.toString(), {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body,
        });

        const webResp = await handler(webReq);

        resp.writeHead(
            webResp.status,
            Object.fromEntries(webResp.headers.entries()),
        );
        const buf = await webResp.arrayBuffer();
        resp.end(Buffer.from(buf));
    },
);