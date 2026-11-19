import * as restate from "@restatedev/restate-sdk-gen";
import {agent, asyncTool} from "@restatedev/agentlib";
import {z} from "zod";
import {model} from "./model.js";
import {bookRoom, redact, redactJson} from "./services.js";

// <start_tool_before>
type Quote = {hotelId: string; quotedTotalCents: number; maxTotalCents: number};

const booking = agent<Quote>({
  model,
  tools: {
    bookHotel: asyncTool({
      description: "Book the quoted hotel. The application supplies the price.",
      input: z.object({hotelId: z.string()}), // the model cannot set the price
      *before({hotelId}, {context}) {
        if (hotelId !== context.hotelId) return "Only the quoted hotel can be booked";
        if (context.quotedTotalCents > context.maxTotalCents) return "The quote exceeds the budget";
      },
      async execute({hotelId}, {context}) {
        return await bookRoom(hotelId, context.quotedTotalCents);
      },
    }),
  },
});

export const hotelBooking = restate.service({
  name: "HotelBooking",
  handlers: {
    *book({request, quote}: {request: string; quote: Quote}) {
      const result = yield* booking.run(request, {context: quote});
      return result.status === "completed" ? result.output : (result.output ?? result.reason);
    },
  },
});
// <end_tool_before>

// <start_before_tool>
const assistant = agent<{role: "customer" | "admin"}>({
  model,
  tools: {
    deleteAccount: asyncTool({
      description: "Delete an account.",
      input: z.object({accountId: z.string()}),
      async execute({accountId}) {
        return {accountId, status: "deleted"};
      },
    }),
  },
  *beforeTool(call, {context}) {
    if (call.name === "deleteAccount" && context.role !== "admin") {
      return "Only admins can delete accounts";
    }
  },
});
// <end_before_tool>

// <start_redact>
const support = agent({
  model,
  *beforeRun(messages) {
    const input = messages.at(-1); // the run's input is the last message
    if (input?.role === "user") return {message: redact(input.content)};
  },
  *beforeSteering({message}) {
    return {message: redact(message)};
  },
  *afterTool(output) {
    return redactJson(output); // redacts every string in the output
  },
});
// <end_redact>

export const agents = {assistant, support};
