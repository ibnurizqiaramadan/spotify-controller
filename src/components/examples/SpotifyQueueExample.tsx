"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

export default function SpotifyQueueExample() {
  const queue = useQuery(api.queue.getQueue);
  const addToQueue = useMutation(api.queue.addToQueue);
  const removeFromQueue = useMutation(api.queue.removeFromQueue);
  const updateTrackStatus = useMutation(api.queue.updateTrackStatus);
  
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToQueue = async () => {
    setIsLoading(true);
    try {
      await addToQueue({
        spotifyId: "example-track-id",
        name: "Example Song",
        uri: "spotify:track:example-track-id",
        href: "https://api.spotify.com/v1/tracks/example-track-id",
        externalUrl: "https://open.spotify.com/track/example-track-id",
        durationMs: 180000,
        explicit: false,
        artists: [{
          id: "artist-1",
          name: "Example Artist",
          uri: "spotify:artist:artist-1",
          href: "https://api.spotify.com/v1/artists/artist-1",
          externalUrl: "https://open.spotify.com/artist/artist-1",
        }],
        album: {
          id: "album-1",
          name: "Example Album",
          albumType: "album",
          uri: "spotify:album:album-1",
          href: "https://api.spotify.com/v1/albums/album-1",
          externalUrl: "https://open.spotify.com/album/album-1",
          releaseDate: "2024-01-01",
          totalTracks: 10,
          images: [{ height: 640, url: "https://example.com/album-art.jpg", width: 640 }],
        },
        addedBy: "user-123",
        requestedBy: "John Doe",
        notes: "Great song!",
      });
    } catch (error) {
      console.error("Failed to add to queue:", error);
    }
    setIsLoading(false);
  };

  const handleRemoveFromQueue = async (trackId: string) => {
    try {
      await removeFromQueue({
        trackId: trackId as any,
        removedBy: "user-123",
      });
    } catch (error) {
      console.error("Failed to remove from queue:", error);
    }
  };

  const handlePlayTrack = async (trackId: string) => {
    try {
      await updateTrackStatus({
        trackId: trackId as any,
        status: "playing",
      });
    } catch (error) {
      console.error("Failed to play track:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Spotify Queue Example</h2>
      
      <button
        onClick={handleAddToQueue}
        disabled={isLoading}
        className="mb-4 px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? "Adding..." : "Add Example Track"}
      </button>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold mb-2">Current Queue:</h3>
        {queue === undefined ? (
          <p>Loading...</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-400">Queue is empty</p>
        ) : (
          queue.map((track: any, index: number) => (
            <div
              key={track._id}
              className="flex items-center justify-between p-3 bg-gray-800 rounded"
            >
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">#{index + 1}</span>
                <div>
                  <p className="font-medium">{track.name}</p>
                  <p className="text-sm text-gray-400">{track.artists.map((a: { name: string }) => a.name).join(", ")}</p>
                  <p className="text-xs text-gray-500">
                    Added by: {track.requestedBy || track.addedBy}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {track.status === "pending" && (
                  <>
                    <button
                      onClick={() => handlePlayTrack(track._id)}
                      className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                    >
                      Play
                    </button>
                    <button
                      onClick={() => handleRemoveFromQueue(track._id)}
                      className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </>
                )}
                {track.status === "playing" && (
                  <span className="px-3 py-1 bg-green-600 rounded text-sm">
                    Now Playing
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
