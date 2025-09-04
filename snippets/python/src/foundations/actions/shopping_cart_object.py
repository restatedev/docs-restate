shopping_cart_object = restate.VirtualObject("ShoppingCartObject")


@shopping_cart_object.handler()
async def empty_expired_cart(ctx: ObjectContext) -> None:
    pass
