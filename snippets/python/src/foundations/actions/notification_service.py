from typing import Dict

import restate

notification_service = restate.Service("NotificationService")


@notification_service.handler()
async def send_email(ctx: restate.Context, req: Dict[str, str]) -> None:
    pass


@notification_service.handler()
async def send_reminder(ctx: restate.Context, req: Dict[str, str]) -> None:
    pass
