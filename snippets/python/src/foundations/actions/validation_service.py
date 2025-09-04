# Mock services for examples
validation_service = restate.Service("ValidationService")


@validation_service.handler()
async def validate_order(ctx: Context, order: Any) -> Dict:
    return {"valid": True}