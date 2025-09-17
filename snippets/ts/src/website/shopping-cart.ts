import * as restate from "@restatedev/restate-sdk";
const shared = restate.handlers.object.shared;

interface Item {
  productId: string;
  quantity: number;
  price: number;
}

// <start_here>
restate.object({
  name: "ShoppingCart",
  handlers: {
    add: async (ctx: restate.ObjectContext, item: Item) => {
      const items = (await ctx.get<Item[]>("cart")) ?? [];
      items.push(item);
      ctx.set("cart", items);
      return items;
    },

    get: async (ctx: restate.ObjectContext) => {
      return ctx.get<Item[]>("cart");
    },
  },
});
// <end_here>
