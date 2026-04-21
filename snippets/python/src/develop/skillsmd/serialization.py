import json
import typing

# <start_pydantic>
import restate
from pydantic import BaseModel
from restate.serde import Serde


class Greeting(BaseModel):
    name: str

class GreetingResponse(BaseModel):
    result: str

greeter = restate.Service("Greeter")

@greeter.handler()
async def greet(ctx: restate.Context, greeting: Greeting) -> GreetingResponse:
    return GreetingResponse(result=f"You said hi to {greeting.name}!")
# <end_pydantic>

my_object = restate.VirtualObject("MyService")

# <start_custom>
class MyData(typing.TypedDict):
    """Represents a response from the GPT model."""

    some_value: str
    my_number: int


class MySerde(Serde[MyData]):
    def deserialize(self, buf: bytes) -> typing.Optional[MyData]:
        if not buf:
            return None
        data = json.loads(buf)
        return MyData(some_value=data["some_value"], my_number=data["some_number"])

    def serialize(self, obj: typing.Optional[MyData]) -> bytes:
        if obj is None:
            return bytes()
        data = {"some_value": obj["some_value"], "some_number": obj["my_number"]}
        return bytes(json.dumps(data), "utf-8")

# For the input/output serialization of your handlers
@my_object.handler(input_serde=MySerde(), output_serde=MySerde())
async def my_handler(ctx: restate.ObjectContext, greeting: str) -> str:

    # To serialize state
    await ctx.get("my_state", serde=MySerde())
    ctx.set("my_state", MyData(some_value="Hi", my_number=15), serde=MySerde())

    # To serialize awakeable payloads
    ctx.awakeable(serde=MySerde())

    # etc.

    return "some-output"
# <end_custom>