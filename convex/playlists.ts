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
      tracks: [],
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
    track: trackValidator,
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Check if track already exists in playlist
    const trackExists = playlist.tracks.some(
      (t) => t.spotifyId === args.track.spotifyId
    );

    if (trackExists) {
      throw new Error("Track already in playlist");
    }

    const updatedTracks = [...playlist.tracks, args.track];

    await ctx.db.patch(args.playlistId, {
      tracks: updatedTracks,
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

    const updatedTracks = playlist.tracks.filter(
      (t) => t.spotifyId !== args.spotifyId
    );

    await ctx.db.patch(args.playlistId, {
      tracks: updatedTracks,
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.playlistId);
  },
});

// Reorder tracks in playlist
export const reorderPlaylistTracks = mutation({
  args: {
    playlistId: v.id("playlists"),
    fromIndex: v.number(),
    toIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    const tracks = [...playlist.tracks];
    const [movedTrack] = tracks.splice(args.fromIndex, 1);
    tracks.splice(args.toIndex, 0, movedTrack);

    await ctx.db.patch(args.playlistId, {
      tracks,
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.playlistId);
  },
});

// Bulk add tracks to playlist
export const bulkAddTracksToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    tracks: v.array(trackValidator),
  },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }

    // Filter out duplicates
    const existingIds = new Set(playlist.tracks.map((t) => t.spotifyId));
    const newTracks = args.tracks.filter((t) => !existingIds.has(t.spotifyId));

    const updatedTracks = [...playlist.tracks, ...newTracks];

    await ctx.db.patch(args.playlistId, {
      tracks: updatedTracks,
      updatedAt: Date.now(),
    });

    return { addedCount: newTracks.length };
  },
});
