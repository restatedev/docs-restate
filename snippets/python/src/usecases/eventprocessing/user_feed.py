from datetime import timedelta

import restate

from utils import (
    create_post,
    get_post_status,
    update_user_feed,
    SocialMediaPost,
    Status,
)

# <start_here>
user_feed = restate.VirtualObject("UserFeed")


@user_feed.handler()
async def process_post(ctx: restate.ObjectContext, post: SocialMediaPost):
    user_id = ctx.key()

    post_id = await ctx.run_typed(
        "create post", create_post, user_id=user_id, post=post
    )

    while (
        await ctx.run_typed("get status", get_post_status, post_id=post_id)
        == Status.PENDING
    ):
        await ctx.sleep(timedelta(seconds=5))

    await ctx.run_typed("update feed", update_user_feed, user=user_id, post_id=post_id)


# <end_here>

app = restate.app([user_feed])

if __name__ == "__main__":
    import hypercorn
    import hypercorn.asyncio
    import asyncio

    conf = hypercorn.Config()
    conf.bind = ["0.0.0.0:9080"]
    asyncio.run(hypercorn.asyncio.serve(app, conf))
