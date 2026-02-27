import * as restate from "@restatedev/restate-sdk";

export const orderProcessor = restate.service({
    name: "OrderProcessor",
    handlers: {
        process: async (ctx: restate.Context, order: { id: string; item: string }) => {
            const confirmation = await ctx.run(() => chargePayment(order));
            await ctx.run(() => reserveInventory(order));
            await ctx.run(() => sendConfirmation(order, confirmation));
            return { status: "completed", orderId: order.id };
        },
    },
});

export type OrderProcessor = typeof orderProcessor;

async function chargePayment(order: { id: string; item: string }) {
    console.log(`Charging payment for order ${order.id}`);
    return `conf-${order.id}`;
}

async function reserveInventory(order: { id: string; item: string }) {
    console.log(`Reserving inventory for ${order.item}`);
}

async function sendConfirmation(order: { id: string; item: string }, confirmation: string) {
    console.log(`Sending confirmation ${confirmation} for order ${order.id}`);
}