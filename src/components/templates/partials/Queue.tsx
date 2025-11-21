"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getQueue } from "@/data/layer/player";
import QueueItem from "@/components/queue/QueueItem";
import { appStore } from "@/stores/AppStores";

export default function Queue() {
  const { app, setQueue, setRefreshQueue } = appStore((state) => state);
  const prevQueueRef = useRef(app.queue);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [fetchAttempts, setFetchAttempts] = useState(0);

  const fetchQueue = useCallback(async () => {
    // Prevent refetching too frequently
    const now = Date.now();
    if (now - lastFetchTime < 5000) return;

    setLastFetchTime(now);
    const [response] = await getQueue();

    // Don't log these unless debugging
    // console.log(response, error);
    // console.log("response", response?.currently_playing);

    if (response?.currently_playing == null) return setQueue(null);

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
  }, [setQueue, lastFetchTime, fetchAttempts]);

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
        {app?.queue?.queue?.length && app?.queue?.queue?.length > 0 && (
          <>
            <div className="mb-4">
              <h4 className="text-xl font-bold p-2 text-white mb-2 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-400 rounded-full"></span>
                Now Playing
              </h4>
              {app?.queue?.currently_playing && (
                <div className="bg-zinc-800/50 rounded-lg p-1 border border-green-500/20">
                  <QueueItem
                    key={app.queue.currently_playing.id}
                    item={app.queue.currently_playing}
                    currentPlaying={true}
                  />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold p-2 text-white mb-2 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-zinc-500 to-zinc-400 rounded-full"></span>
                Next Queue
              </h4>
              {app?.queue?.queue?.map((item, index) => (
                <QueueItem key={index} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
