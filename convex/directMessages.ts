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

    const allDMs = await ctx.db
      .query("directMessages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    const dms = allDMs.filter(dm => dm.participants.includes(userId));

    const dmsWithParticipants = await Promise.all(
      dms.map(async (dm) => {
        const participants = await Promise.all(
          dm.participants.map(async (participantId) => {
            const user = await ctx.db.get(participantId);
            return user;
          })
        );
        
        const otherParticipant = participants.find(p => p?._id !== userId);
        
        return {
          ...dm,
          participants: participants.filter(Boolean),
          otherParticipant,
        };
      })
    );

    return dmsWithParticipants;
  },
});

export const create = mutation({
  args: {
    participantId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.participantId) {
      throw new Error("Cannot create DM with yourself");
    }

    // Check if both users are members of the workspace
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    const participantMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.participantId)
      )
      .first();

    if (!userMembership || !participantMembership) {
      throw new Error("Both users must be members of the workspace");
    }

    // Check if DM already exists
    const allDMs = await ctx.db
      .query("directMessages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    const existing = allDMs.find(dm => 
      dm.participants.includes(userId) && dm.participants.includes(args.participantId)
    );

    if (existing) return existing._id;

    const participants = [userId, args.participantId].sort();

    return await ctx.db.insert("directMessages", {
      participants,
      createdBy: userId,
      workspaceId: args.workspaceId,
    });
  },
});

export const getOrCreate = mutation({
  args: {
    participantId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.participantId) {
      throw new Error("Cannot create DM with yourself");
    }

    // Check if both users are members of the workspace
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    const participantMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.participantId)
      )
      .first();

    if (!userMembership || !participantMembership) {
      throw new Error("Both users must be members of the workspace");
    }

    // Check if DM already exists
    const allDMs = await ctx.db
      .query("directMessages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    const existing = allDMs.find(dm => 
      dm.participants.includes(userId) && dm.participants.includes(args.participantId)
    );

    if (existing) return existing._id;

    const participants = [userId, args.participantId].sort();

    return await ctx.db.insert("directMessages", {
      participants,
      createdBy: userId,
      workspaceId: args.workspaceId,
    });
  },
});
