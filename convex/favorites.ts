import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export interface WatchlistItem {
  filmKey: string;
  title: string;
  addedAt: string;
  priority?: boolean;
}

// Get favorites for a syncId
export const getFavorites = query({
  args: { syncId: v.string() },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    return result?.favorites || [];
  },
});

// Set all favorites for a syncId
export const setFavorites = mutation({
  args: {
    syncId: v.string(),
    favorites: v.array(v.object({
      filmKey: v.string(),
      title: v.string(),
      addedAt: v.string(),
      priority: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        favorites: args.favorites,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("favorites", {
        syncId: args.syncId,
        favorites: args.favorites,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Add a single favorite
export const addFavorite = mutation({
  args: {
    syncId: v.string(),
    item: v.object({
      filmKey: v.string(),
      title: v.string(),
      addedAt: v.string(),
      priority: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    if (existing) {
      // Check if already exists
      const itemExists = existing.favorites.some(
        (f) => f.filmKey === args.item.filmKey
      );
      
      if (!itemExists) {
        const updatedFavorites = [...existing.favorites, args.item];
        await ctx.db.patch(existing._id, {
          favorites: updatedFavorites,
          lastUpdated: Date.now(),
        });
      }
    } else {
      await ctx.db.insert("favorites", {
        syncId: args.syncId,
        favorites: [args.item],
        lastUpdated: Date.now(),
      });
    }
  },
});

// Remove a favorite
export const removeFavorite = mutation({
  args: {
    syncId: v.string(),
    filmKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    if (existing) {
      const updatedFavorites = existing.favorites.filter(
        (f) => f.filmKey !== args.filmKey
      );
      await ctx.db.patch(existing._id, {
        favorites: updatedFavorites,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Toggle priority for a favorite
export const togglePriority = mutation({
  args: {
    syncId: v.string(),
    filmKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    if (existing) {
      const updatedFavorites = existing.favorites.map((f) => {
        if (f.filmKey === args.filmKey) {
          return {
            ...f,
            priority: !f.priority,
          };
        }
        return f;
      });
      
      await ctx.db.patch(existing._id, {
        favorites: updatedFavorites,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Check if syncId exists and has favorites
export const checkSyncIdExists = query({
  args: { syncId: v.string() },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("favorites")
      .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
      .first();
    
    return {
      exists: !!result,
      hasFavorites: result ? result.favorites.length > 0 : false,
      count: result ? result.favorites.length : 0,
    };
  },
});

