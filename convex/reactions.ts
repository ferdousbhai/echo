import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Group reactions by emoji and count them
    const reactionCounts: Record<string, { 
      count: number; 
      users: string[]; 
      currentUserReacted: boolean 
    }> = {};

    const userId = await getAuthUserId(ctx);
    
    for (const reaction of reactions) {
      const emoji = reaction.emoji;
      if (!reactionCounts[emoji]) {
        reactionCounts[emoji] = {
          count: 0,
          users: [],
          currentUserReacted: false
        };
      }
      
      reactionCounts[emoji].count += 1;
      reactionCounts[emoji].users.push(reaction.userId);
      
      if (userId && reaction.userId === userId) {
        reactionCounts[emoji].currentUserReacted = true;
      }
    }

    return reactionCounts;
  },
});

export const add = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already reacted with this emoji
    const existingReaction = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_emoji", (q) => 
        q.eq("messageId", args.messageId).eq("emoji", args.emoji)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    // If user already reacted with this emoji, remove the reaction (toggle)
    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
      return { removed: true };
    }

    // Add new reaction
    await ctx.db.insert("reactions", {
      messageId: args.messageId,
      emoji: args.emoji,
      userId: userId,
      createdAt: Date.now(),
    });

    return { removed: false };
  },
});

export const remove = mutation({
  args: {
    reactionId: v.id("reactions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reaction = await ctx.db.get(args.reactionId);
    if (!reaction) throw new Error("Reaction not found");
    if (reaction.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.reactionId);
  },
});
