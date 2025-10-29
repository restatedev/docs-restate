import restate
import hypercorn
import asyncio
from .basic_service import subscription_service
from .workflow import signup_workflow
from .object import cart_object

# <start_here>
app = restate.app([subscription_service, cart_object, signup_workflow])

if __name__ == "__main__":
    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
# <end_here>
