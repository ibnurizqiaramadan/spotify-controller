import { Doc } from "../../convex/_generated/dataModel";
import { Track, Artist, Album } from "../data/responseTypes";

export function convexTrackToSpotifyTrack(convexTrack: Doc<"queue">): Track {
  return {
    id: convexTrack.spotifyId,
    name: convexTrack.name,
    uri: convexTrack.uri,
    href: convexTrack.href,
    external_urls: { spotify: convexTrack.externalUrl },
    duration_ms: convexTrack.durationMs,
    explicit: convexTrack.explicit,
    popularity: convexTrack.popularity ?? 0,
    preview_url: convexTrack.previewUrl ?? null,
    track_number: convexTrack.trackNumber ?? 0,
    disc_number: convexTrack.discNumber ?? 0,
    is_local: convexTrack.isLocal ?? false,
    is_playable: convexTrack.isPlayable ?? false,
    type: "track",
    artists: convexTrack.artists.map(convexArtistToSpotifyArtist),
    album: convexAlbumToSpotifyAlbum(convexTrack.album),
    external_ids: { isrc: "" }, // Not stored in Convex
  };
}

export function convexArtistToSpotifyArtist(convexArtist: any): Artist {
  return {
    id: convexArtist.id,
    name: convexArtist.name,
    uri: convexArtist.uri,
    href: convexArtist.href,
    external_urls: { spotify: convexArtist.externalUrl },
    type: "artist",
  };
}

export function convexAlbumToSpotifyAlbum(convexAlbum: any): Album {
  return {
    id: convexAlbum.id,
    name: convexAlbum.name,
    album_type: convexAlbum.albumType,
    uri: convexAlbum.uri,
    href: convexAlbum.href,
    external_urls: { spotify: convexAlbum.externalUrl },
    release_date: convexAlbum.releaseDate,
    release_date_precision: "day",
    total_tracks: convexAlbum.totalTracks,
    type: "album",
    images: convexAlbum.images,
    artists: convexAlbum.artists || [], // Will be populated if needed
    available_markets: [],
    is_playable: true,
  };
}

export function convexNowPlayingToSpotifyTrack(convexNowPlaying: any): Track {
  return {
    id: convexNowPlaying.spotifyId,
    name: convexNowPlaying.name,
    uri: convexNowPlaying.uri,
    href: "", // Not stored in Convex
    external_urls: { spotify: "" }, // Not stored in Convex
    duration_ms: convexNowPlaying.durationMs,
    explicit: false, // Not stored in Convex
    popularity: 0, // Not stored in Convex
    preview_url: null, // Not stored in Convex
    track_number: 0, // Not stored in Convex
    disc_number: 0, // Not stored in Convex
    is_local: false, // Not stored in Convex
    is_playable: true, // Not stored in Convex
    type: "track",
    artists: convexNowPlaying.artists.map(convexArtistToSpotifyArtist),
    album: convexAlbumToSpotifyAlbum(convexNowPlaying.album),
    external_ids: { isrc: "" },
  };
}
