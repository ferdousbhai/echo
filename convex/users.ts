import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    return await ctx.db.get(userId);
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is a member of the workspace
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!userMembership) return [];

    // Get all workspace members
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const users = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return user && user._id !== userId ? user : null;
      })
    );

    return users.filter(Boolean);
  },
});

export const setupKeys = mutation({
  args: {
    publicKey: v.string(),
    privateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if keys already exist
    const existing = await ctx.db
      .query("userKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        privateKey: args.privateKey,
      });
    } else {
      await ctx.db.insert("userKeys", {
        userId,
        publicKey: args.publicKey,
        privateKey: args.privateKey,
      });
    }
  },
});

export const getPublicKey = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("userKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return keys?.publicKey || null;
  },
});

export const getPrivateKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const keys = await ctx.db
      .query("userKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return keys?.privateKey || null;
  },
});
