import os

from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor
from opentelemetry import trace as trace_api
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from restate.ext.tracing import RestateTracerProvider

parseable_url = os.environ["PARSEABLE_URL"].rstrip("/")
provider = TracerProvider(
    resource=Resource.create({"service.name": "restate-openai-agent"})
)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(
            endpoint=f"{parseable_url}/v1/traces",
            headers={
                "Authorization": f"Bearer {os.environ['PARSEABLE_API_KEY']}",
                "X-P-Stream": os.getenv(
                    "PARSEABLE_STREAM", "<parseable-dataset>"
                ),
            },
        )
    )
)
trace_api.set_tracer_provider(provider)

OpenAIAgentsInstrumentor().instrument(
    tracer_provider=RestateTracerProvider(provider)
)
