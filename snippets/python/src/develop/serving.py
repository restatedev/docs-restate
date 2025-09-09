from src.develop.my_service import my_service
from src.develop.my_virtual_object import my_object

# <start_endpoint>
import restate

app = restate.app(services=[my_service, my_object])
# <end_endpoint>


# <start_identity>
app = restate.app(
    services=[my_service],
    identity_keys=["publickeyv1_w7YHemBctH5Ck2nQRQ47iBBqhNHy4FV7t2Usbye2A6f"],
)
# <end_identity>


# <start_hypercorn>
if __name__ == "__main__":
    import hypercorn
    import hypercorn.asyncio
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
# <end_hypercorn>


# <start_fastapi>
from fastapi import FastAPI

app = FastAPI()

app.mount("/restate/v1", restate.app(services=[my_service, my_object]))
# <end_fastapi>
