import restate
from pydantic import BaseModel
from restate import ObjectContext, ObjectSharedContext
from typing import List, Optional


class Item(BaseModel):
    product_id: str
    quantity: int
    price: float


class Cart(BaseModel):
    items: List[Item] = []


# <start_here>
cart_object = restate.VirtualObject("ShoppingCart")


@cart_object.handler()
async def add_item(ctx: ObjectContext, item: Item) -> Cart:
    cart = await ctx.get("cart", type_hint=Cart) or Cart()
    cart.items.append(item)
    ctx.set("cart", cart)
    return cart


@cart_object.handler(kind="shared")
async def get_total(ctx: ObjectSharedContext) -> float:
    cart = await ctx.get("cart", type_hint=Cart) or Cart()
    return sum(item.price * item.quantity for item in cart.items)


# <end_here>
