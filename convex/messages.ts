import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByChannel = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(50);

    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        const threadCount = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("threadId", message._id))
          .collect();
        
        // Get reactions for this message
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Group reactions by emoji and count them
        const reactionCounts: Record<string, { 
          count: number; 
          users: string[]; 
          currentUserReacted: boolean 
        }> = {};

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
          
          if (reaction.userId === userId) {
            reactionCounts[emoji].currentUserReacted = true;
          }
        }
        
        return {
          ...message,
          author,
          threadCount: threadCount.length,
          reactions: reactionCounts,
        };
      })
    );

    return messagesWithAuthors.reverse();
  },
});

export const listByDM = query({
  args: {
    dmId: v.id("directMessages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_dm", (q) => q.eq("dmId", args.dmId))
      .filter((q) => q.eq(q.field("threadId"), undefined))
      .order("desc")
      .take(50);

    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        const threadCount = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("threadId", message._id))
          .collect();
        
        // Get reactions for this message
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Group reactions by emoji and count them
        const reactionCounts: Record<string, { 
          count: number; 
          users: string[]; 
          currentUserReacted: boolean 
        }> = {};

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
          
          if (reaction.userId === userId) {
            reactionCounts[emoji].currentUserReacted = true;
          }
        }
        
        return {
          ...message,
          author,
          threadCount: threadCount.length,
          reactions: reactionCounts,
        };
      })
    );

    return messagesWithAuthors.reverse();
  },
});

export const listThread = query({
  args: {
    threadId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        
        // Get reactions for this message
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Group reactions by emoji and count them
        const reactionCounts: Record<string, { 
          count: number; 
          users: string[]; 
          currentUserReacted: boolean 
        }> = {};

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
          
          if (reaction.userId === userId) {
            reactionCounts[emoji].currentUserReacted = true;
          }
        }
        
        return {
          ...message,
          author,
          reactions: reactionCounts,
        };
      })
    );

    return messagesWithAuthors;
  },
});

export const send = mutation({
  args: {
    content: v.string(),
    encryptionKey: v.string(),
    channelId: v.optional(v.id("channels")),
    dmId: v.optional(v.id("directMessages")),
    threadId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("messages", {
      content: args.content,
      encryptionKey: args.encryptionKey,
      authorId: userId,
      channelId: args.channelId,
      dmId: args.dmId,
      threadId: args.threadId,
    });
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    encryptionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.messageId, {
      content: args.content,
      encryptionKey: args.encryptionKey,
      isEdited: true,
      editedAt: Date.now(),
    });
  },
});

export const delete_ = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.messageId);
  },
});
