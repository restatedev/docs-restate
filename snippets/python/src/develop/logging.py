import logging

import restate


logging.basicConfig(level=logging.INFO)

service = restate.Service("Greeter")


# <start_restate_logger>
logger = restate.getLogger(__name__)


@service.handler()
async def greet(ctx: restate.Context, name: str) -> str:
    logger.info("Processing greeting for %s", name)
    return f"Hello, {name}!"
# <end_restate_logger>


# <start_logging_filter>
standard_logger = logging.getLogger("my-application")
standard_logger.addFilter(restate.RestateLoggingFilter())
# <end_logging_filter>
