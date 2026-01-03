import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Example query function
export const getExample = query({
  args: {},
  handler: async (ctx: any) => {
    return { message: "Hello from Convex!" };
  },
});

// Example mutation function
export const createExample = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx: any, args: { text: string }) => {
    // Example: Save data to a table
    // const exampleId = await ctx.db.insert("examples", { text: args.text });
    // return exampleId;
    return { success: true, text: args.text };
  },
});
