import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get workspaces where user is a member
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db.get(membership.workspaceId);
        return workspace ? { ...workspace, role: membership.role } : null;
      })
    );

    return workspaces.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      isPublic: args.isPublic,
    });

    // Add creator as admin
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });

    // Create a general channel
    const channelId = await ctx.db.insert("channels", {
      name: "general",
      description: "General discussion",
      isPrivate: false,
      createdBy: userId,
      workspaceId,
      members: [userId],
    });

    // Add creator as channel member
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user is a member
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!membership) return null;

    const workspace = await ctx.db.get(args.workspaceId);
    return workspace ? { ...workspace, role: membership.role } : null;
  },
});

export const createInvite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    maxUses: v.optional(v.number()),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only workspace admins can create invites");
    }

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    const expiresAt = args.expiresInDays 
      ? Date.now() + (args.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const inviteId = await ctx.db.insert("workspaceInvites", {
      workspaceId: args.workspaceId,
      inviteCode,
      createdBy: userId,
      expiresAt,
      maxUses: args.maxUses,
      currentUses: 0,
      isActive: true,
    });

    return { inviteId, inviteCode };
  },
});

export const getInviteInfo = query({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite || !invite.isActive) return null;

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < Date.now()) return null;

    // Check if max uses reached
    if (invite.maxUses && invite.currentUses >= invite.maxUses) return null;

    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) return null;

    return {
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description,
      },
      invite: {
        _id: invite._id,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        currentUses: invite.currentUses,
      },
    };
  },
});

export const joinWorkspace = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!invite || !invite.isActive) {
      throw new Error("Invalid or expired invite");
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw new Error("Invite has expired");
    }

    // Check if max uses reached
    if (invite.maxUses && invite.currentUses >= invite.maxUses) {
      throw new Error("Invite has reached maximum uses");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", invite.workspaceId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("You are already a member of this workspace");
    }

    // Add user to workspace
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invite.workspaceId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });

    // Update invite usage count
    await ctx.db.patch(invite._id, {
      currentUses: invite.currentUses + 1,
    });

    // Add user to general channel if it exists
    const generalChannel = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", invite.workspaceId))
      .filter((q) => q.eq(q.field("name"), "general"))
      .first();

    if (generalChannel) {
      await ctx.db.insert("channelMembers", {
        channelId: generalChannel._id,
        userId,
        joinedAt: Date.now(),
      });
    }

    return invite.workspaceId;
  },
});

export const listInvites = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is admin
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") return [];

    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return invites;
  },
});

export const deactivateInvite = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    // Check if user is admin of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) => 
        q.eq("workspaceId", invite.workspaceId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only workspace admins can deactivate invites");
    }

    await ctx.db.patch(args.inviteId, {
      isActive: false,
    });
  },
});
