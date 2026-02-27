import { api } from "encore.dev/api";
import * as restate from "@restatedev/restate-sdk-clients";
import { OrderProcessor } from "./restate";

const restateClient = restate.connect({ url: "http://localhost:8080" });

export const createOrder = api(
    { method: "POST", path: "/orders", expose: true },
    async (req: { item: string }): Promise<{ orderId: string }> => {
        const orderId = `order-${Date.now()}`;
        await restateClient
            .serviceSendClient<OrderProcessor>({ name: "OrderProcessor" })
            .process({ id: orderId, item: req.item });
        return { orderId };
    },
);