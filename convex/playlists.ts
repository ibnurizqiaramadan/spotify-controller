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

// Track validator for playlist
const trackValidator = v.object({
  spotifyId: v.string(),
  name: v.string(),
  uri: v.string(),
  durationMs: v.number(),
  artists: v.array(artistValidator),
  album: albumValidator,
  addedAt: v.number(),
  addedBy: v.id("users"),
  position: v.number(),
});

// Create playlist
export const createPlaylist = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isPublic: v.boolean(),
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.ownerId);
    if (!user) {
      throw new Error("User not found");
    }

    const playlistId = await ctx.db.insert("playlists", {
      name: args.name,
      description: args.description,
      image: args.image,
      isPublic: args.isPublic,
      ownerId: args.ownerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return playlistId;
  },
});

// Get playlist by ID
export const getPlaylistById = query({
  args: {
    playlistId: v.id("playlists"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.playlistId);
  },
});

// Get playlist with items
export const getPlaylistWithItems = query({
  args: {
    playlistId: v.id("playlists"),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) return null;

    const items = await ctx.db
      .query("playlistItems")
      .withIndex("by_playlistId", (q) => q.eq("playlistId", args.playlistId))
      .order("asc")
      .collect();

    return {
      ...playlist,
      items,
    };
  },
});

// Get user's playlists
export const getUserPlaylists = query({
  args: {
    ownerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("playlists")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

// Get public playlists
export const getPublicPlaylists = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("playlists")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect();
  },
});

// Update playlist
export const updatePlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.image !== undefined) updates.image = args.image;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.playlistId, updates);

    return ctx.db.get(args.playlistId);
  },
});

// Delete playlist
export const deletePlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    await ctx.db.delete(args.playlistId);

    return { success: true };
  },
});

// Add track to playlist
export const addTrackToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    spotifyId: v.string(),
    name: v.string(),
    uri: v.string(),
    durationMs: v.number(),
    artists: v.array(artistValidator),
    album: albumValidator,
    addedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Get current max position
    const existingItems = await ctx.db
      .query("playlistItems")
      .withIndex("by_playlistId", (q) => q.eq("playlistId", args.playlistId))
      .collect();
    
    const newPosition = existingItems.length > 0 ? 
      Math.max(...existingItems.map(item => item.position)) + 1 : 0;

    // Insert new track
    await ctx.db.insert("playlistItems", {
      playlistId: args.playlistId,
      spotifyId: args.spotifyId,
      name: args.name,
      uri: args.uri,
      durationMs: args.durationMs,
      artists: args.artists,
      album: args.album,
      addedAt: Date.now(),
      addedBy: args.addedBy,
      position: newPosition,
    });

    // Update playlist timestamp
    await ctx.db.patch(args.playlistId, {
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.playlistId);
  },
});

// Remove track from playlist
export const removeTrackFromPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    spotifyId: v.string(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Find and delete the track
    const trackToDelete = await ctx.db
      .query("playlistItems")
      .withIndex("by_playlistId", (q) => 
        q.eq("playlistId", args.playlistId)
      )
      .filter((q) => q.eq(q.field("spotifyId"), args.spotifyId))
      .first();

    if (trackToDelete) {
      await ctx.db.delete(trackToDelete._id);
    }

    // Update playlist timestamp
    await ctx.db.patch(args.playlistId, {
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.playlistId);
  },
});

// Reorder tracks in playlist
export const reorderPlaylistTracks = mutation({
  args: {
    playlistId: v.id("playlists"),
    fromPosition: v.number(),
    toPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Get all items
    const items = await ctx.db
      .query("playlistItems")
      .withIndex("by_playlistId_position", (q) => q.eq("playlistId", args.playlistId))
      .collect();

    // Find the item to move
    const itemToMove = items.find(item => item.position === args.fromPosition);
    if (!itemToMove) {
      throw new Error("Track not found at position");
    }

    // Update positions
    if (args.fromPosition < args.toPosition) {
      // Moving down
      items.forEach(item => {
        if (item.position > args.fromPosition && item.position <= args.toPosition) {
          ctx.db.patch(item._id, { position: item.position - 1 });
        }
      });
    } else {
      // Moving up
      items.forEach(item => {
        if (item.position >= args.toPosition && item.position < args.fromPosition) {
          ctx.db.patch(item._id, { position: item.position + 1 });
        }
      });
    }

    // Update moved item position
    await ctx.db.patch(itemToMove._id, { position: args.toPosition });

    // Update playlist timestamp
    await ctx.db.patch(args.playlistId, {
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.playlistId);
  },
});

// Bulk add tracks to playlist
export const bulkAddTracksToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    tracks: v.array(v.object({
      spotifyId: v.string(),
      name: v.string(),
      uri: v.string(),
      durationMs: v.number(),
      artists: v.array(artistValidator),
      album: albumValidator,
      addedBy: v.id("users"),
    })),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Get existing tracks
    const existingItems = await ctx.db
      .query("playlistItems")
      .withIndex("by_playlistId", (q) => q.eq("playlistId", args.playlistId))
      .collect();
    
    const existingIds = new Set(existingItems.map((t) => t.spotifyId));
    
    // Get next position
    const nextPosition = existingItems.length > 0 ? 
      Math.max(...existingItems.map(item => item.position)) + 1 : 0;

    // Filter out duplicates and insert new tracks
    let addedCount = 0;
    for (let i = 0; i < args.tracks.length; i++) {
      const track = args.tracks[i];
      if (!existingIds.has(track.spotifyId)) {
        await ctx.db.insert("playlistItems", {
          playlistId: args.playlistId,
          spotifyId: track.spotifyId,
          name: track.name,
          uri: track.uri,
          durationMs: track.durationMs,
          artists: track.artists,
          album: track.album,
          addedAt: Date.now(),
          addedBy: track.addedBy,
          position: nextPosition + i,
        });
        addedCount++;
      }
    }

    // Update playlist timestamp
    if (addedCount > 0) {
      await ctx.db.patch(args.playlistId, {
        updatedAt: Date.now(),
      });
    }

    return { addedCount };
  },
});
