from typing import Any

import restate

analytics_service = restate.Service("AnalyticsService")


@analytics_service.handler()
async def record_event(ctx: restate.Context, event: Any) -> None:
    pass
