import * as restate from "@restatedev/restate-sdk";

interface Item {
  productId: string;
  quantity: number;
  price: number;
}

// <start_here>
const cartObject = restate.object({
  name: "cart",
  handlers: {
    addItem: async (ctx: restate.ObjectContext, item: Item) => {
      const items = (await ctx.get<Item[]>("items")) ?? [];
      const existing = items.find((i) => i.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        items.push(item);
      }
      ctx.set("items", items);
      return items;
    },

    getTotal: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext) => {
        const items = (await ctx.get<Item[]>("items")) ?? [];
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
    ),
  },
});
// <end_here>

export default cartObject;
