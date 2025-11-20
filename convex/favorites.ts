import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export interface WatchlistItem {
  filmKey: string;
  title: string;
  addedAt: string;
  priority?: boolean;
}

// Security constants
const MAX_FAVORITES = 10000; // Maximum number of favorites per syncId
const MIN_SYNC_ID_LENGTH = 3; // Minimum syncId length
const MAX_SYNC_ID_LENGTH = 200; // Maximum syncId length
const SYNC_ID_REGEX = /^[a-zA-Z0-9_-]+$/; // Allowed characters for syncId

// Validate syncId format
function validateSyncId(syncId: string): void {
  if (!syncId || typeof syncId !== 'string') {
    throw new Error('Invalid syncId: must be a non-empty string');
  }
  
  if (syncId.length < MIN_SYNC_ID_LENGTH) {
    throw new Error(`Invalid syncId: must be at least ${MIN_SYNC_ID_LENGTH} characters`);
  }
  
  if (syncId.length > MAX_SYNC_ID_LENGTH) {
    throw new Error(`Invalid syncId: must be at most ${MAX_SYNC_ID_LENGTH} characters`);
  }
  
  if (!SYNC_ID_REGEX.test(syncId)) {
    throw new Error('Invalid syncId: contains invalid characters (only letters, numbers, hyphens, and underscores allowed)');
  }
}

// Validate favorites array
function validateFavorites(favorites: any[]): void {
  if (!Array.isArray(favorites)) {
    throw new Error('Invalid favorites: must be an array');
  }
  
  if (favorites.length > MAX_FAVORITES) {
    throw new Error(`Too many favorites: maximum ${MAX_FAVORITES} allowed`);
  }
  
  // Validate each favorite item
  for (let i = 0; i < favorites.length; i++) {
    const fav = favorites[i];
    if (!fav || typeof fav !== 'object') {
      throw new Error(`Invalid favorite at index ${i}: must be an object`);
    }
    
    if (!fav.filmKey || typeof fav.filmKey !== 'string') {
      throw new Error(`Invalid favorite at index ${i}: filmKey must be a non-empty string`);
    }
    
    if (!fav.title || typeof fav.title !== 'string') {
      throw new Error(`Invalid favorite at index ${i}: title must be a non-empty string`);
    }
    
    if (!fav.addedAt || typeof fav.addedAt !== 'string') {
      throw new Error(`Invalid favorite at index ${i}: addedAt must be a non-empty string`);
    }
    
    // Validate string lengths
    if (fav.filmKey.length > 500) {
      throw new Error(`Invalid favorite at index ${i}: filmKey too long (max 500 characters)`);
    }
    
    if (fav.title.length > 500) {
      throw new Error(`Invalid favorite at index ${i}: title too long (max 500 characters)`);
    }
  }
}

// Get favorites for a syncId
export const getFavorites = query({
  args: { syncId: v.string() },
  handler: async (ctx, args) => {
    // Validate syncId format
    validateSyncId(args.syncId);
    
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
    // Validate inputs
    validateSyncId(args.syncId);
    validateFavorites(args.favorites);
    
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
    // Validate inputs
    validateSyncId(args.syncId);
    validateFavorites([args.item]); // Validate single item
    
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
        // Check if adding would exceed limit
        if (existing.favorites.length >= MAX_FAVORITES) {
          throw new Error(`Cannot add favorite: maximum ${MAX_FAVORITES} favorites allowed`);
        }
        
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
    // Validate inputs
    validateSyncId(args.syncId);
    
    if (!args.filmKey || typeof args.filmKey !== 'string') {
      throw new Error('Invalid filmKey: must be a non-empty string');
    }
    
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
    // Validate inputs
    validateSyncId(args.syncId);
    
    if (!args.filmKey || typeof args.filmKey !== 'string') {
      throw new Error('Invalid filmKey: must be a non-empty string');
    }
    
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
    // Validate syncId format
    validateSyncId(args.syncId);
    
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

