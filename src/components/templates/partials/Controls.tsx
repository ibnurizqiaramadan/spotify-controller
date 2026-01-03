"use client";

import { Button, Progress } from "@heroui/react";
import Image from "next/image";
import { appStore } from "@/stores/AppStores";
import { getNowPlaying } from "@/data/layer/player";
import { useCallback, useEffect, useState, useMemo } from "react";

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function Controls() {
  const { app, setNowPlaying, setRefreshQueue } = appStore((state) => state);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const formattedProgress = useMemo(() => formatTime(progress), [progress]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  const fetchNowPlaying = useCallback(async () => {
    // Prevent fetching more often than every 5 seconds
    const now = Date.now();
    if (now - lastFetchTime < 5000) return;

    setLastFetchTime(now);
    const [response, error] = await getNowPlaying();
    if (error) console.error(error);
    if (response) {
      setNowPlaying(response);
      setProgress(response.progress_ms);
      setDuration(response.item.duration_ms);
    }
  }, [setNowPlaying, lastFetchTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (app.queue?.currently_playing == null) return;
      fetchNowPlaying();
    }, 10000); // Polling every 10 seconds is fine
    return () => clearInterval(interval);
  }, [app.queue?.currently_playing, fetchNowPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (app.queue?.currently_playing == null) return;
      setProgress((prev) => prev + 1000);
      // Only trigger refresh when truly at the end of song
      if (progress >= duration && duration > 0) {
        setProgress(0);
        fetchNowPlaying();
        setRefreshQueue(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    progress,
    duration,
    fetchNowPlaying,
    setRefreshQueue,
    app.queue?.currently_playing,
  ]);

  useEffect(() => {
    fetchNowPlaying();
  }, [fetchNowPlaying]);

  return (
    <div className="flex flex-row justify-between items-center bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 rounded-xl shadow-2xl border border-zinc-800/50 max-h-[90px] flex-grow min-h-[90px] p-3 px-4 backdrop-blur-sm">
      <div
        className="
        hidden
        flex-row 
        items-center 
        xl:flex
        xl:w-1/3
        lg:flex
        lg:w-1/2
        md:flex
        md:w-1/2
        sm:flex
        sm:w-1/2
        gap-3
        "
      >
        {app?.nowPlaying?.item?.album?.images[0].url ? (
          <>
            <div className="relative group">
              <Image
                className="rounded-lg shadow-lg ring-2 ring-zinc-700/50 transition-all duration-300 group-hover:ring-green-500/50 group-hover:scale-105"
                src={app.nowPlaying.item.album.images[0].url}
                alt="Spotify"
                width={64}
                height={64}
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col overflow-hidden text-ellipsis py-2 px-2 min-w-0">
              <h4
                className={`font-bold text-lg overflow-hidden whitespace-nowrap text-ellipsis px-1 text-white transition-colors duration-200`}
              >
                {app.nowPlaying.item.name}
              </h4>
              <p className="text-sm text-zinc-400 overflow-hidden whitespace-nowrap text-ellipsis px-1 mt-0.5">
                {app.nowPlaying.item.artists
                  .map((artist) => artist.name)
                  .join(", ")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-row items-center">
            <h4 className="text-lg text-zinc-500 font-medium">
              No song playing
            </h4>
          </div>
        )}
      </div>
      <div
        className=" 
          flex-col 
          items-center 
          justify-center
          w-full
          xl:w-1/3
          xl:left-1/2
          xl:absolute
          xl:transform 
          xl:-translate-x-1/2
          xl:flex
          lg:flex 
          lg:right-0
          lg:transform 
          lg:w-1/2
          md:flex 
          md:gap-3 
          md:w-1/2
          sm:flex
          sm:gap-3 
          sm:w-1/2
          gap-2
        "
      >
        <div className="hidden flex-row items-center justify-center gap-3">
          <Button
            size="sm"
            color="default"
            className="bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Previous
          </Button>
          <Button
            size="sm"
            color="success"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Play
          </Button>
          <Button
            size="sm"
            color="default"
            className="bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Next
          </Button>
        </div>
        <div className="flex w-full flex-row items-center justify-center gap-4 px-4">
          <p className="text-xs text-zinc-400 font-mono min-w-[40px] text-right">
            {formattedProgress}
          </p>
          <div className="flex-1 max-w-md">
            <Progress
              aria-labelledby="progress-label"
              size="sm"
              color="success"
              value={progress}
              maxValue={duration}
              className="w-full"
              classNames={{
                track: "bg-zinc-800",
                indicator: "bg-gradient-to-r from-green-500 to-green-400",
              }}
            />
          </div>
          <p className="text-xs text-zinc-400 font-mono min-w-[40px] text-left">
            {formattedDuration}
          </p>
        </div>
      </div>
      <div className="hidden flex-row items-center xl:flex justify-end w-1/3">
        {/* ListDevice component hidden */}
      </div>
    </div>
  );
}
