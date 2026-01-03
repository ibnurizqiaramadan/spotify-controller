"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { getQueue } from "@/data/layer/player";
import QueueItem from "@/components/queue/QueueItem";
import { appStore } from "@/stores/AppStores";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { convexNowPlayingToSpotifyTrack, convexTrackToSpotifyTrack } from "@/utils/convex-to-spotify";
import { QueueResponse } from "@/data/responseTypes";

export default function Queue() {
  const { app, setQueue, setRefreshQueue } = appStore((state) => state);
  
  // Get data from Convex
  const convexQueue = useQuery(api.queue.getQueue);
  const convexNowPlaying = useQuery(api.queue.getNowPlaying);
  
  // Mutations
  const syncNowPlaying = useMutation(api.queue.syncNowPlaying);
  const removeFromQueue = useMutation(api.queue.removeFromQueue);
  
  const prevQueueRef = useRef<QueueResponse | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [spotifyQueue, setSpotifyQueue] = useState<QueueResponse | null>(null);

  const fetchQueue = useCallback(async () => {
    // Prevent refetching too frequently
    const now = Date.now();
    if (now - lastFetchTime < 5000) return;

    setLastFetchTime(now);
    const [response] = await getQueue();

    // Don't log these unless debugging
    // console.log(response, error);
    // console.log("response", response?.currently_playing);

    if (response?.currently_playing == null) {
      setQueue(null);
      return;
    }

    // Sync now playing to Convex (but not the queue)
    try {
      if (response.currently_playing) {
        await syncNowPlaying({
          spotifyId: response.currently_playing.id,
          name: response.currently_playing.name,
          uri: response.currently_playing.uri,
          durationMs: response.currently_playing.duration_ms,
          artists: response.currently_playing.artists.map(artist => ({
            id: artist.id,
            name: artist.name,
            uri: artist.uri,
            href: artist.href,
            externalUrl: artist.external_urls.spotify,
          })),
          album: {
            id: response.currently_playing.album.id,
            name: response.currently_playing.album.name,
            albumType: response.currently_playing.album.album_type,
            uri: response.currently_playing.album.uri,
            href: response.currently_playing.album.href,
            externalUrl: response.currently_playing.album.external_urls.spotify,
            releaseDate: response.currently_playing.album.release_date,
            totalTracks: response.currently_playing.album.total_tracks,
            images: response.currently_playing.album.images,
          },
          progressMs: 0, // Not available in QueueResponse
          isPlaying: false, // Not available in QueueResponse
          timestamp: Date.now(),
          device: {
            id: "",
            name: "",
            type: "",
            isActive: false,
            volumePercent: 0,
          },
          shuffleState: false,
          repeatState: "",
        });
      }
    } catch (error) {
      console.error("Error syncing now playing to Convex:", error);
    }

    // Store Spotify queue separately
    setSpotifyQueue(response);
    
    // Check if the queue has changed
    if (JSON.stringify(response) !== JSON.stringify(prevQueueRef.current)) {
      if (response?.queue.length && response?.queue.length > 0) {
        setQueue(response);
        prevQueueRef.current = response;
        setFetchAttempts(0); // Reset attempts counter on success
        return;
      }

      // Prevent infinite loops by limiting fetch attempts
      if (fetchAttempts < 2) {
        setFetchAttempts((prev) => prev + 1);
        // Use setTimeout instead of recursive call
        setTimeout(() => fetchQueue(), 2000);
      }
    }
  }, [setQueue, lastFetchTime, fetchAttempts, syncNowPlaying]);

  useEffect(() => {
    fetchQueue();
    // Set up a reasonable polling interval instead of continuous fetching
    const interval = setInterval(() => {
      fetchQueue();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchQueue]);

  useEffect(() => {
    if (app.refreshQueue) {
      fetchQueue();
      setRefreshQueue(false);
    }
  }, [app, app.refreshQueue, fetchQueue, setRefreshQueue]);

  // Remove track from queue when it starts playing
  useEffect(() => {
    if (convexNowPlaying && convexQueue && convexQueue.length > 0) {
      const trackInQueue = convexQueue.find(
        (track) => track.spotifyId === convexNowPlaying.spotifyId
      );
      
      if (trackInQueue) {
        // Remove the track from queue
        removeFromQueue({ 
          trackId: trackInQueue._id, 
          removedBy: "system" 
        }).catch(console.error);
      }
    }
  }, [convexNowPlaying?.spotifyId, convexQueue, removeFromQueue]);

  // Filter system queue to exclude tracks that are in user queue
  const filteredSystemQueue = useMemo(() => {
    if (!spotifyQueue?.queue) return [];
    
    return spotifyQueue.queue.filter(
      (spotifyTrack) => !convexQueue?.some(
        (convexTrack) => convexTrack.spotifyId === spotifyTrack.id
      )
    );
  }, [spotifyQueue?.queue, convexQueue]);

  return (
    <div
      className={`flex flex-col bg-gradient-to-b from-zinc-900/95 to-zinc-900/90 rounded-xl h-full p-3 shadow-xl border border-zinc-800/50 backdrop-blur-sm overflow-hidden ${
        app.isSidebarVisible === false &&
        (app.search?.tracks?.items.length ?? 0) > 0
          ? "hidden"
          : ""
      }`}
    >
      <div className="overflow-y-auto flex-1 min-h-0 max-w-full">
        {/* Now Playing Section */}
        <div className="mb-4">
          <h4 className="text-xl font-bold p-2 text-white mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-400 rounded-full"></span>
            Now Playing
          </h4>
          {convexNowPlaying ? (
            <div className="bg-zinc-800/50 rounded-lg p-1 border border-green-500/20">
              <QueueItem
                key={convexNowPlaying.spotifyId}
                item={convexNowPlayingToSpotifyTrack(convexNowPlaying)}
                currentPlaying={true}
              />
            </div>
          ) : (
            <div className="text-center text-zinc-500 py-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <p className="text-sm">Nothing is playing</p>
            </div>
          )}
        </div>

        {/* Next User Queue Section */}
        <div className="mb-4">
          <h4 className="text-xl font-bold p-2 text-white mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></span>
            Next User Queue
            {convexQueue && convexQueue.length > 0 && (
              <span className="text-xs text-zinc-400 ml-auto">
                {convexQueue.length} track{convexQueue.length > 1 ? "s" : ""}
              </span>
            )}
          </h4>
          {convexQueue && convexQueue.length > 0 ? (
            convexQueue.map((item, index) => (
              <QueueItem 
                key={item._id} 
                item={convexTrackToSpotifyTrack(item)} 
                addedBy={item.addedBy}
              />
            ))
          ) : (
            <div className="text-center text-zinc-500 py-4">
              <p className="text-sm">No user requests</p>
              <p className="text-xs text-zinc-600">Add tracks to queue</p>
            </div>
          )}
        </div>

        {/* Next System Queue Section */}
        <div>
          <h4 className="text-xl font-bold p-2 text-white mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-zinc-500 to-zinc-400 rounded-full"></span>
            Next System Queue
            <span className="text-xs text-zinc-400 ml-auto">
              {filteredSystemQueue.length} track{filteredSystemQueue.length > 1 ? "s" : ""}
            </span>
          </h4>
          {filteredSystemQueue.length > 0 ? (
            filteredSystemQueue.map((item, index) => (
              <QueueItem 
                key={`spotify-${item.id}`} 
                item={item} 
              />
            ))
          ) : (
            <div className="text-center text-zinc-500 py-4">
              <p className="text-sm">No tracks in system queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
