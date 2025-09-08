import * as restate from "@restatedev/restate-sdk";

class SocialMediaPost {}

function createPost(userId: string, post: SocialMediaPost) {
  return undefined;
}

function getPostStatus(postId: any) {
  return "pending";
}

function updateUserFeed(userId: string, postId: any) {
  return undefined;
}

const PENDING = "pending";

// <start_here>
const userFeed = restate.object({
  name: "userFeed",
  handlers: {
    processPost: async (ctx: restate.ObjectContext, post: SocialMediaPost) => {
      const userId = ctx.key;

      const postId = await ctx.run(() => createPost(userId, post));

      // Wait for processing to complete with durable timers
      while ((await ctx.run(() => getPostStatus(postId))) === PENDING) {
        await ctx.sleep({ seconds: 5 });
      }

      await ctx.run(() => updateUserFeed(userId, postId));
    },
  },
});
// <end_here>
