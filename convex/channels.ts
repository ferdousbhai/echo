import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!workspaceMembership) return [];

    // Get channels where user is a member
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const channels = await Promise.all(
      memberships.map(async (membership) => {
        const channel = await ctx.db.get(membership.channelId);
        return channel && channel.workspaceId === args.workspaceId ? channel : null;
      })
    );

    return channels.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!workspaceMembership) {
      throw new Error("You are not a member of this workspace");
    }

    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      description: args.description,
      isPrivate: args.isPrivate,
      createdBy: userId,
      workspaceId: args.workspaceId,
      members: [userId],
    });

    // Add creator as member
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      joinedAt: Date.now(),
    });

    return channelId;
  },
});

export const join = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Check if user is a member of the workspace (skip if no workspaceId for legacy channels)
    if (channel.workspaceId) {
      const workspaceMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) => 
          q.eq("workspaceId", channel.workspaceId!).eq("userId", userId)
        )
        .first();

      if (!workspaceMembership) {
        throw new Error("You are not a member of this workspace");
      }
    }

    // Check if already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) return;

    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId,
      joinedAt: Date.now(),
    });
  },
});

export const getMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return user;
      })
    );

    return members.filter(Boolean);
  },
});
