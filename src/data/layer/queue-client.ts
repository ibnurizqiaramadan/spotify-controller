"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Track } from "../responseTypes";

export const useAddToQueue = () => {
  const addToQueueMutation = useMutation(api.queue.addToQueue);

  const addToQueue = async ({ 
    track, 
    userEmail 
  }: { 
    track: Track; 
    userEmail: string;
  }) => {
    try {
      await addToQueueMutation({
        spotifyId: track.id,
        name: track.name,
        uri: track.uri,
        href: track.href,
        externalUrl: track.external_urls.spotify,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        previewUrl: track.preview_url || undefined,
        trackNumber: track.track_number,
        discNumber: track.disc_number,
        isLocal: track.is_local,
        isPlayable: track.is_playable,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri,
          href: artist.href,
          externalUrl: artist.external_urls.spotify,
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          albumType: track.album.album_type,
          uri: track.album.uri,
          href: track.album.href,
          externalUrl: track.album.external_urls.spotify,
          releaseDate: track.album.release_date,
          totalTracks: track.album.total_tracks,
          images: track.album.images,
        },
        addedBy: userEmail,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error adding to queue:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to add to queue" };
    }
  };

  return { addToQueue };
};
