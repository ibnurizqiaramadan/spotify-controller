import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Artist validator
const artistValidator = v.object({
  id: v.string(),
  name: v.string(),
  uri: v.string(),
  href: v.string(),
  externalUrl: v.string(),
});

// Album image validator
const albumImageValidator = v.object({
  height: v.number(),
  url: v.string(),
  width: v.number(),
});

// Album validator
const albumValidator = v.object({
  id: v.string(),
  name: v.string(),
  albumType: v.string(),
  uri: v.string(),
  href: v.string(),
  externalUrl: v.string(),
  releaseDate: v.string(),
  totalTracks: v.number(),
  images: v.array(albumImageValidator),
});

// Add a track to the queue
export const addToQueue = mutation({
  args: {
    spotifyId: v.string(),
    name: v.string(),
    uri: v.string(),
    href: v.string(),
    externalUrl: v.string(),
    durationMs: v.number(),
    explicit: v.boolean(),
    popularity: v.optional(v.number()),
    previewUrl: v.optional(v.string()),
    trackNumber: v.optional(v.number()),
    discNumber: v.optional(v.number()),
    isLocal: v.optional(v.boolean()),
    isPlayable: v.optional(v.boolean()),
    artists: v.array(artistValidator),
    album: albumValidator,
    addedBy: v.string(),
    requestedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.query("users")
      .withIndex("by_email", (q) => q.eq("email", args.addedBy))
      .first();
    
    if (!user) {
      throw new Error("User must be logged in to add tracks to queue");
    }
    
    const settings = await ctx.db.query("queueSettings").first();
    
    if (settings?.isLocked) {
      throw new Error("Queue is currently locked");
    }
    
    const currentQueueSize = await ctx.db.query("queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    
    if (settings && currentQueueSize.length >= settings.maxQueueSize) {
      throw new Error("Queue is full");
    }
    
    if (settings && !settings.allowDuplicates) {
      const existingTrack = await ctx.db.query("queue")
        .withIndex("by_spotifyId", (q) => q.eq("spotifyId", args.spotifyId))
        .first();
      
      if (existingTrack && existingTrack.status === "pending") {
        throw new Error("Track already in queue");
      }
    }
    
    const lastTrack = await ctx.db.query("queue")
      .withIndex("by_position")
      .order("desc")
      .first();
    
    const nextPosition = lastTrack ? lastTrack.position + 1 : 1;
    
    const queueId = await ctx.db.insert("queue", {
      ...args,
      addedAt: Date.now(),
      position: nextPosition,
      status: "pending",
    });
    
    return queueId;
  },
});

// Get the current queue
export const getQueue = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("queue")
      .withIndex("by_position")
      .order("asc")
      .collect();
  },
});

// Get pending tracks only
export const getPendingQueue = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Get the current playing track
export const getCurrentTrack = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("queue")
      .withIndex("by_status", (q) => q.eq("status", "playing"))
      .first();
  },
});

// Update track status
export const updateTrackStatus = mutation({
  args: {
    trackId: v.id("queue"),
    status: v.string(),
    skipReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      throw new Error("Track not found");
    }
    
    if (args.status === "playing") {
      await ctx.db.patch(args.trackId, {
        status: args.status,
        playedAt: Date.now(),
      });
    } else if (args.status === "skipped") {
      await ctx.db.patch(args.trackId, {
        status: args.status,
        skippedAt: Date.now(),
        skipReason: args.skipReason,
      });
    } else {
      await ctx.db.patch(args.trackId, {
        status: args.status,
      });
    }
    
    // Move to history if played or skipped
    if (args.status === "played" || args.status === "skipped") {
      await ctx.db.insert("queueHistory", {
        spotifyId: track.spotifyId,
        name: track.name,
        uri: track.uri,
        durationMs: track.durationMs,
        artists: track.artists,
        album: track.album,
        addedBy: track.addedBy,
        addedAt: track.addedAt,
        playedAt: track.playedAt ?? Date.now(),
        wasSkipped: args.status === "skipped",
        skipReason: args.skipReason,
        requestedBy: track.requestedBy,
        notes: track.notes,
      });
      
      await ctx.db.delete(args.trackId);
      
      // Reorder remaining tracks
      const remainingTracks = await ctx.db.query("queue")
        .withIndex("by_position")
        .filter((q) => q.gt(q.field("position"), track.position))
        .collect();
      
      for (const remainingTrack of remainingTracks) {
        await ctx.db.patch(remainingTrack._id, {
          position: remainingTrack.position - 1,
        });
      }
    }
    
    return { success: true };
  },
});

// Remove track from queue
export const removeFromQueue = mutation({
  args: {
    trackId: v.id("queue"),
    removedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) {
      throw new Error("Track not found");
    }
    
    if (track.status !== "pending") {
      throw new Error("Can only remove pending tracks");
    }
    
    await ctx.db.delete(args.trackId);
    
    // Reorder remaining tracks
    const remainingTracks = await ctx.db.query("queue")
      .withIndex("by_position")
      .filter((q) => q.gt(q.field("position"), track.position))
      .collect();
    
    for (const remainingTrack of remainingTracks) {
      await ctx.db.patch(remainingTrack._id, {
        position: remainingTrack.position - 1,
      });
    }
    
    return { success: true };
  },
});

// Get queue history
export const getQueueHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.query("queueHistory")
      .withIndex("by_playedAt")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// Sync now playing from Spotify
export const syncNowPlaying = mutation({
  args: {
    spotifyId: v.string(),
    name: v.string(),
    uri: v.string(),
    durationMs: v.number(),
    artists: v.array(artistValidator),
    album: albumValidator,
    progressMs: v.number(),
    isPlaying: v.boolean(),
    timestamp: v.number(),
    device: v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      isActive: v.boolean(),
      volumePercent: v.number(),
    }),
    shuffleState: v.optional(v.boolean()),
    repeatState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get existing now playing record
    const existing = await ctx.db.query("nowPlaying").first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return { updated: true, id: existing._id };
    }
    
    const id = await ctx.db.insert("nowPlaying", {
      ...args,
      updatedAt: Date.now(),
    });
    
    return { updated: false, id };
  },
});

// Get now playing
export const getNowPlaying = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("nowPlaying").first();
  },
});

// Initialize queue settings
export const initializeQueueSettings = mutation({
  args: {
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("queueSettings").first();
    
    if (existing) {
      return existing;
    }
    
    const settingsId = await ctx.db.insert("queueSettings", {
      maxQueueSize: 50,
      allowDuplicates: false,
      duplicateThreshold: 30,
      autoSkipThreshold: 3,
      maxSongDuration: 600000,
      restrictedUsers: [],
      isPaused: false,
      isLocked: false,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });
    
    return ctx.db.get(settingsId);
  },
});

// Update queue settings
export const updateQueueSettings = mutation({
  args: {
    isLocked: v.optional(v.boolean()),
    isPaused: v.optional(v.boolean()),
    allowDuplicates: v.optional(v.boolean()),
    maxQueueSize: v.optional(v.number()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    let settings = await ctx.db.query("queueSettings").first();
    
    // Initialize if not exists
    if (!settings) {
      const settingsId = await ctx.db.insert("queueSettings", {
        isLocked: false,
        isPaused: false,
        allowDuplicates: false,
        maxQueueSize: 100,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
      settings = await ctx.db.get(settingsId);
    }
    
    if (!settings) {
      throw new Error("Failed to initialize queue settings");
    }
    
    await ctx.db.patch(settings._id, {
      ...args,
      updatedAt: Date.now(),
    });
    
    return ctx.db.get(settings._id);
  },
});

// Get queue settings
export const getQueueSettings = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("queueSettings").first();
  },
});

// Bulk add tracks to queue
export const bulkAddToQueue = mutation({
  args: {
    tracks: v.array(v.object({
      spotifyId: v.string(),
      name: v.string(),
      uri: v.string(),
      href: v.string(),
      externalUrl: v.string(),
      durationMs: v.number(),
      explicit: v.boolean(),
      popularity: v.optional(v.number()),
      previewUrl: v.optional(v.string()),
      trackNumber: v.optional(v.number()),
      discNumber: v.optional(v.number()),
      isLocal: v.optional(v.boolean()),
      isPlayable: v.optional(v.boolean()),
      artists: v.array(artistValidator),
      album: albumValidator,
    })),
    addedBy: v.string(),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("queueSettings").first();
    
    if (settings?.isLocked) {
      throw new Error("Queue is currently locked");
    }
    
    // Clear existing queue if specified
    if (args.clearExisting) {
      const existingQueue = await ctx.db.query("queue").collect();
      for (const item of existingQueue) {
        await ctx.db.delete(item._id);
      }
    }
    
    const lastTrack = await ctx.db.query("queue")
      .withIndex("by_position")
      .order("desc")
      .first();
    
    let nextPosition = lastTrack ? lastTrack.position + 1 : 1;
    const addedIds = [];
    
    for (const track of args.tracks) {
      if (settings && !settings.allowDuplicates && !args.clearExisting) {
        const existing = await ctx.db.query("queue")
          .withIndex("by_spotifyId", (q) => q.eq("spotifyId", track.spotifyId))
          .first();
        
        if (existing) {
          continue;
        }
      }
      
      const id = await ctx.db.insert("queue", {
        ...track,
        addedBy: args.addedBy,
        addedAt: Date.now(),
        position: nextPosition,
        status: "pending",
      });
      
      addedIds.push(id);
      nextPosition++;
    }
    
    return { addedCount: addedIds.length, ids: addedIds };
  },
});
