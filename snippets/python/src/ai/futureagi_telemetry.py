import os

from fi_instrumentation import FITracer, TraceConfig, register  # type: ignore[import-untyped]
from fi_instrumentation.fi_types import ProjectType  # type: ignore[import-untyped]
from openai import AsyncOpenAI
from restate.ext.tracing import RestateTracerProvider
from traceai_openai import OpenAIInstrumentor

# 1. A Future AGI tracer provider. Not registered globally: only the Restate-aware wrapper below uses it.
tracer_provider = register(
    project_name=os.environ.get("FI_PROJECT_NAME", "restate-agent"),
    project_type=ProjectType.OBSERVE,
    set_global_tracer_provider=False,
    verbose=False,
)
# 2. Every span created through this wrapper becomes a child of the Restate invocation attempt
#    that is running, and no span is created while Restate replays already-journaled steps.
restate_tracer_provider = RestateTracerProvider(tracer_provider)
OpenAIInstrumentor().instrument(tracer_provider=restate_tracer_provider)
tracer = FITracer(restate_tracer_provider.get_tracer(__name__), config=TraceConfig())

# Restate retries failed steps itself, so the OpenAI client should not retry on its own.
client = AsyncOpenAI(max_retries=0)
