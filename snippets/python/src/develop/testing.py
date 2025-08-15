# <start_service>
import restate

greeter = restate.Service("greeter")


@greeter.handler()
async def greet(ctx: restate.Context, name: str) -> str:
    return f"Hello {name}!"


app = restate.app(services=[greeter])
# <end_service>


# <start_testing>
import restate

with restate.test_harness(app) as harness:
    restate_client = harness.ingress_client()
    print(restate_client.post("/greeter/greet", json="Alice").json())
# <end_testing>
