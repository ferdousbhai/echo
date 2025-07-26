import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    isPublic: v.boolean(),
  }).index("by_creator", ["createdBy"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    inviteCode: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    isActive: v.boolean(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_code", ["inviteCode"]),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    createdBy: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")), // Made optional for migration
    members: v.array(v.id("users")),
  })
    .index("by_name", ["name"])
    .index("by_workspace", ["workspaceId"]),

  directMessages: defineTable({
    participants: v.array(v.id("users")),
    createdBy: v.id("users"),
    workspaceId: v.id("workspaces"),
  })
    .index("by_participants", ["participants"])
    .index("by_workspace", ["workspaceId"]),

  messages: defineTable({
    content: v.string(), // encrypted content
    encryptionKey: v.string(), // encrypted with recipient's public key
    authorId: v.id("users"),
    channelId: v.optional(v.id("channels")),
    dmId: v.optional(v.id("directMessages")),
    threadId: v.optional(v.id("messages")), // parent message for threads
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
  })
    .index("by_channel", ["channelId"])
    .index("by_dm", ["dmId"])
    .index("by_thread", ["threadId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    emoji: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_emoji", ["messageId", "emoji"])
    .index("by_user", ["userId"]),

  userKeys: defineTable({
    userId: v.id("users"),
    publicKey: v.string(),
    privateKey: v.string(), // encrypted with user's password
  }).index("by_user", ["userId"]),

  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
