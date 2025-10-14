import restate

from src.develop.my_service import app

with restate.test_harness(app) as harness:
    restate_client = harness.ingress_client()
    print(restate_client.post("/greeter/greet", json="Alice").json())