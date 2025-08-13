import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

const service = restate.service({
  name: "Awakeable",
  handlers: {
    greet: async (ctx: restate.Context, name: string) => {
      // <start_here>
      // Create awakeable and get unique ID
      const { id, promise } = ctx.awakeable<string>();

      // Send ID to external system (email, queue, webhook, etc.)
      await ctx.run(() => requestHumanReview(name, id));

      // Handler suspends here until external completion
      const review = await promise;

      // Continue processing with the result
      console.log("Review received:", review);
      // <end_here>

      // <start_resolve>
      // Complete with success data
      ctx.resolveAwakeable(id, { approved: true, comments: "Looks good!" });
      // <end_resolve>

      // <start_reject>
      // Complete with error
      ctx.rejectAwakeable(id, "Review timeout exceeded");
      // <end_reject>
    },
  },
});

function requestHumanReview(name: string, awakeableId: string) {
  return "123";
}

restate.workflow({
  name: "reviewWorkflow",
  handlers: {
    run: async (ctx: WorkflowContext, name: string) => {
      await ctx.run(() => askReview(name));
      // <start_promise>
      // Wait for a promise by name - suspends until resolved
      const review = await ctx.promise<string>("review");
      // <end_promise>
      // ... do something with review
    },

    submitReview: (ctx: restate.WorkflowSharedContext, review: string) => {
      // <start_resolve_promise>
      // Resolve from any workflow handler
      ctx.promise<string>("review").resolve(review);
      // <end_resolve_promise>
    },
  },
});

// <start_review>
restate.workflow({
  name: "reviewWorkflow",
  handlers: {
    // Main workflow execution
    run: async (ctx: WorkflowContext, documentId: string) => {
      // Send document for review
      await ctx.run(() => askReview(documentId));

      // Wait for external review submission
      const review = await ctx.promise<string>("review");

      // Process the review result
      return processReview(documentId, review);
    },

    // External endpoint to submit reviews
    submitReview: (ctx: restate.WorkflowSharedContext, review: string) => {
      // Signal the waiting run handler
      ctx.promise<string>("review").resolve(review);
    },
  },
});
// <end_review>

function askReview(email: string) {
  return "123";
}
