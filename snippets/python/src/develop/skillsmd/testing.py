# <start_here>
import restate

from ..my_service import app

with restate.test_harness(app, always_replay=True) as harness:
    client = harness.ingress_client()

    # Invoke a service handler
    response = client.post("/MyService/myHandler", json="Hello")
    assert response.json() == "Hello!"

    # Invoke a Virtual Object handler
    response = client.post("/MyObject/myKey/myHandler", json="Hello")
    assert response.json() == "Hello myKey!"
# <end_here>
