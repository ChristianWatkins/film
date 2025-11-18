import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  favorites: defineTable({
    syncId: v.string(),
    favorites: v.array(v.object({
      filmKey: v.string(),
      title: v.string(),
      addedAt: v.string(),
      priority: v.optional(v.boolean()),
    })),
    lastUpdated: v.number(),
  }).index("by_syncId", ["syncId"]),
});

