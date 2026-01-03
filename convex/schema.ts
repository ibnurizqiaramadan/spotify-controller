import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Artist validator (from Spotify Artist type)
const artistValidator = v.object({
  id: v.string(),
  name: v.string(),
  uri: v.string(),
  href: v.string(),
  externalUrl: v.string(),
});

// Album image validator (from Spotify AlbumImage type)
const albumImageValidator = v.object({
  height: v.number(),
  url: v.string(),
  width: v.number(),
});

// Album validator (from Spotify Album type)
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

export default defineSchema({
  // Queue table for managing song requests (based on Spotify Track type)
  queue: defineTable({
    // Track information (from Spotify Track type)
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
    
    // Artist info (simplified from Spotify Artist type)
    artists: v.array(artistValidator),
    
    // Album info (from Spotify Album type)
    album: albumValidator,
    
    // Queue metadata
    addedBy: v.string(),
    addedAt: v.number(),
    position: v.number(),
    status: v.string(), // "pending", "playing", "played", "skipped"
    
    // Additional metadata
    requestedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.number()),
    
    // Playback control
    playedAt: v.optional(v.number()),
    skippedAt: v.optional(v.number()),
    skipReason: v.optional(v.string()),
  })
    .index("by_position", ["position"])
    .index("by_status", ["status"])
    .index("by_addedBy", ["addedBy"])
    .index("by_addedAt", ["addedAt"])
    .index("by_spotifyId", ["spotifyId"]),
    
  // Queue history for tracking played tracks
  queueHistory: defineTable({
    // Track information
    spotifyId: v.string(),
    name: v.string(),
    uri: v.string(),
    durationMs: v.number(),
    
    // Artist info
    artists: v.array(artistValidator),
    
    // Album info
    album: albumValidator,
    
    // History metadata
    addedBy: v.string(),
    addedAt: v.number(),
    playedAt: v.number(),
    playedBy: v.optional(v.string()),
    
    // Playback metrics
    actualDuration: v.optional(v.number()),
    wasSkipped: v.boolean(),
    skipReason: v.optional(v.string()),
    
    // Additional info
    requestedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_playedAt", ["playedAt"])
    .index("by_addedBy", ["addedBy"])
    .index("by_spotifyId", ["spotifyId"]),

  // Now playing state (from Spotify SpotifyNowPlaying type)
  nowPlaying: defineTable({
    // Track info
    spotifyId: v.string(),
    name: v.string(),
    uri: v.string(),
    durationMs: v.number(),
    artists: v.array(artistValidator),
    album: albumValidator,
    
    // Playback state
    progressMs: v.number(),
    isPlaying: v.boolean(),
    timestamp: v.number(),
    
    // Device info (from Spotify Device type)
    device: v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),
      isActive: v.boolean(),
      volumePercent: v.number(),
    }),
    
    // Context
    shuffleState: v.optional(v.boolean()),
    repeatState: v.optional(v.string()),
    
    // Metadata
    updatedAt: v.number(),
  }),
    
  // Queue settings and configuration
  queueSettings: defineTable({
    maxQueueSize: v.number(),
    allowDuplicates: v.boolean(),
    duplicateThreshold: v.optional(v.number()),
    autoSkipThreshold: v.optional(v.number()),
    maxSongDuration: v.optional(v.number()),
    restrictedUsers: v.optional(v.array(v.string())),
    isPaused: v.boolean(),
    isLocked: v.boolean(),
    currentTrackId: v.optional(v.id("queue")),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }),

  // User table for authentication
  users: defineTable({
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    role: v.string(), // "admin", "user", "guest"
    googleId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_googleId", ["googleId"])
    .index("by_role", ["role"]),

  // User playlists (custom playlists saved by users)
  playlists: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isPublic: v.boolean(),
    ownerId: v.id("users"),
    tracks: v.array(v.object({
      spotifyId: v.string(),
      name: v.string(),
      uri: v.string(),
      durationMs: v.number(),
      artists: v.array(artistValidator),
      album: albumValidator,
      addedAt: v.number(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_isPublic", ["isPublic"]),
});
