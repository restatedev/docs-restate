import * as restate from "@restatedev/restate-sdk";
import { myService, MyService } from "./my_service";
import { myObject } from "./virtual_object";
import { myWorkflow } from "./workflow";

const service = restate.service({
  name: "Router",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_request_response>
      // To call a Service:
      const svcResponse = await ctx.serviceClient(myService).myHandler("Hi");

      // To call a Virtual Object:
      const objResponse = await ctx.objectClient(myObject, "Mary").myHandler("Hi");

      // To call a Workflow:
      // `run` handler — can only be called once per workflow ID
      const wfResponse = await ctx.workflowClient(myWorkflow, "wf-id").run("Hi");
      // Other handlers can be called anytime within workflow retention
      const result = await ctx.workflowClient(myWorkflow, "wf-id").interactWithWorkflow();
      // <end_request_response>
    },
    greet2: async (ctx: restate.Context, name: string) => {
      // <start_one_way>
      // To message a Service:
      ctx.serviceSendClient(myService).myHandler("Hi");

      // To message a Virtual Object:
      ctx.objectSendClient(myObject, "Mary").myHandler("Hi");

      // To message a Workflow:
      // `run` handler — can only be called once per workflow ID
      ctx.workflowSendClient(myWorkflow, "wf-id").run("Hi");
      // Other handlers can be called anytime within workflow retention
      ctx.workflowSendClient(myWorkflow, "wf-id").interactWithWorkflow();
      // <end_one_way>

      // <start_delayed>
      // To message a Service with a delay:
      ctx
        .serviceSendClient(myService)
        .myHandler("Hi", restate.rpc.sendOpts({ delay: { seconds: 5 } }));

      // To message a Virtual Object with a delay:
      ctx
        .objectSendClient(myObject, "Mary")
        .myHandler("Hi", restate.rpc.sendOpts({ delay: { seconds: 5 } }));

      // To message a Workflow with a delay:
      ctx
        .workflowSendClient(myWorkflow, "Mary")
        .run("Hi", restate.rpc.sendOpts({ delay: { seconds: 5 } }));
      // <end_delayed>

      // <start_ordering>
      ctx.objectSendClient(myObject, "Mary").myHandler("I'm call A");
      ctx.objectSendClient(myObject, "Mary").myHandler("I'm call B");
      // <end_ordering>
    },
    genericGreet: async (ctx: restate.Context, name: string) => {
      // <start_generic_call>
      const response = await ctx.genericCall({
        service: "MyObject",
        method: "myHandler",
        parameter: "Hi",
        key: "Mary", // drop this for Service calls
        inputSerde: restate.serde.json,
        outputSerde: restate.serde.json,
      });
      // <end_generic_call>
      // <start_generic_send>
      ctx.genericSend({
        service: "MyService",
        method: "myHandler",
        parameter: "Hi",
        inputSerde: restate.serde.json,
      });
      // <end_generic_send>
      // <start_generic_delayed>
      ctx.genericSend({
        service: "MyService",
        method: "myHandler",
        parameter: "Hi",
        inputSerde: restate.serde.json,
        delay: { seconds: 5 },
      });
      // <end_generic_delayed>
    },
    greet3: async (ctx: restate.Context) => {
      // <start_idempotency_key>
      // For request-response
      const response = await ctx.serviceClient(myService).myHandler(
        "Hi",
        restate.rpc.opts({
          idempotencyKey: "my-idempotency-key",
        })
      );
      // For sending a message
      ctx.serviceSendClient(myService).myHandler(
        "Hi",
        restate.rpc.sendOpts({
          idempotencyKey: "my-idempotency-key",
        })
      );
      // <end_idempotency_key>
    },
    greet5: async (ctx: restate.Context) => {
      // <start_attach>
      const handle = ctx.serviceSendClient(myService).myHandler(
        "Hi",
        restate.rpc.sendOpts({
          idempotencyKey: "my-idempotency-key",
        })
      );
      const invocationId = await handle.invocationId;

      // Later...
      const response = ctx.attach(invocationId);
      // <end_attach>
    },
    greet4: async (ctx: restate.Context) => {
      // <start_cancel>
      const handle = ctx.serviceSendClient(myService).myHandler("Hi");
      const invocationId = await handle.invocationId;

      // Cancel the invocation
      ctx.cancel(invocationId);
      // <end_cancel>
    },
    greet6: async (ctx: restate.Context) => {
      // <start_export_definition>
      const response = await ctx.serviceClient<MyService>({ name: "MyService" }).myHandler("Hi");
      // <end_export_definition>
    },
    greet7: async (ctx: restate.Context) => {
      // <start_interface>
      interface MyService {
        myHandler(ctx: unknown, greeting: string): Promise<string>;
      }
      const response = await ctx.serviceClient<MyService>({ name: "MyService" }).myHandler("Hi");
      // <end_interface>
    },
    greet8: async (ctx: restate.Context) => {
      // <start_dev_dependency>
      // import type { MyService } from "my-service-package";

      const response = await ctx.serviceClient<MyService>({ name: "MyService" }).myHandler("Hi");
      // <end_dev_dependency>
    },
  },
});
