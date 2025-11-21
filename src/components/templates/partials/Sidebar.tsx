"use client";

import { appStore } from "@/stores/AppStores";
import SearchItems from "@/components/search/SearchItems";
import { memo, useEffect, useCallback, useState, useRef } from "react";
import { getPlaylists, getArtistTopTracks } from "@/data/layer/player";
import { SearchSpotify } from "@/data/layer/search";
import PlaylistItems from "@/components/sidebars/Playlistitems";
import { Button } from "@heroui/react";

const Sidebar = () => {
  const { app, setPlaylists, setArtistTopTracks, setSearch } = appStore(
    (state) => state,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastSelectedArtistIdRef = useRef<string | null>(null);

  useEffect(() => {
    getPlaylists().then(([response, error]) => {
      if (error) console.error(error);
      setPlaylists(response);
    });
  }, [setPlaylists]);

  const fetchArtistTopTracks = useCallback(async () => {
    // Only fetch if there's no search results
    if (
      app?.search?.tracks?.items.length &&
      app?.search?.tracks?.items.length > 0
    ) {
      setArtistTopTracks(null);
      return;
    }

    // Collect all artists from queue (currently_playing + queue items)
    const allArtists: Array<{ id: string; name: string }> = [];

    // Add artists from currently playing
    if (app?.queue?.currently_playing?.artists) {
      app.queue.currently_playing.artists.forEach((artist) => {
        if (artist.id && !allArtists.find((a) => a.id === artist.id)) {
          allArtists.push({ id: artist.id, name: artist.name });
        }
      });
    }

    // Add artists from queue items
    if (app?.queue?.queue && app.queue.queue.length > 0) {
      app.queue.queue.forEach((track) => {
        if (track.artists) {
          track.artists.forEach((artist) => {
            if (artist.id && !allArtists.find((a) => a.id === artist.id)) {
              allArtists.push({ id: artist.id, name: artist.name });
            }
          });
        }
      });
    }

    // If we have artists, pick a random one
    if (allArtists.length > 0) {
      // Shuffle array using Fisher-Yates algorithm for better randomness
      const shuffledArtists = [...allArtists];
      for (let i = shuffledArtists.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArtists[i], shuffledArtists[j]] = [
          shuffledArtists[j],
          shuffledArtists[i],
        ];
      }

      // Filter out the last selected artist if there are other options
      const availableArtists =
        shuffledArtists.length > 1 &&
        lastSelectedArtistIdRef.current &&
        shuffledArtists.some((a) => a.id !== lastSelectedArtistIdRef.current)
          ? shuffledArtists.filter(
              (a) => a.id !== lastSelectedArtistIdRef.current,
            )
          : shuffledArtists;

      // Pick random artist from available artists
      const randomIndex = Math.floor(Math.random() * availableArtists.length);
      const randomArtist = availableArtists[randomIndex];

      if (randomArtist.id) {
        // Store the selected artist ID
        lastSelectedArtistIdRef.current = randomArtist.id;

        const [response, error] = await getArtistTopTracks({
          artistId: randomArtist.id,
        });
        if (error) {
          console.error("Error fetching artist top tracks:", error);
          setArtistTopTracks(null);
        } else {
          setArtistTopTracks(response);
        }
      }
    } else {
      setArtistTopTracks(null);
      lastSelectedArtistIdRef.current = null;
    }
  }, [
    app?.queue?.currently_playing,
    app?.queue?.queue,
    app?.search?.tracks?.items.length,
    setArtistTopTracks,
  ]);

  useEffect(() => {
    fetchArtistTopTracks();
  }, [fetchArtistTopTracks]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchArtistTopTracks();
    setIsRefreshing(false);
  }, [fetchArtistTopTracks]);

  const hasSearchResults =
    app?.search?.tracks?.items.length && app?.search?.tracks?.items.length > 0;

  const loadMoreSearchResults = useCallback(async () => {
    if (
      !app?.search?.tracks ||
      isLoadingMore ||
      !app.search.tracks.next ||
      !app.searchInput
    ) {
      return;
    }

    setIsLoadingMore(true);
    const currentOffset = app.search.tracks.offset + app.search.tracks.limit;

    try {
      const [response, error] = await SearchSpotify({
        query: app.searchInput,
        limit: 20,
        offset: currentOffset,
      });

      if (error) {
        console.error("Error loading more search results:", error);
      } else if (response?.tracks) {
        // Append new results to existing ones
        setSearch({
          tracks: {
            ...response.tracks,
            items: [
              ...(app.search.tracks.items || []),
              ...response.tracks.items,
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [app?.search?.tracks, app?.searchInput, isLoadingMore, setSearch]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!hasSearchResults || !currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          app?.search?.tracks?.next &&
          !isLoadingMore
        ) {
          loadMoreSearchResults();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [
    hasSearchResults,
    app?.search?.tracks?.next,
    isLoadingMore,
    loadMoreSearchResults,
  ]);
  const hasTopTracks =
    app?.artistTopTracks?.tracks && app.artistTopTracks.tracks.length > 0;

  // Get random artist name from top tracks (first track's first artist)
  const randomArtistName =
    app?.artistTopTracks?.tracks?.[0]?.artists?.[0]?.name || null;

  return (
    <div
      className={`bg-gradient-to-b from-zinc-900/95 to-zinc-900/90 rounded-xl h-full w-full p-3 shadow-xl border border-zinc-800/50 backdrop-blur-sm flex flex-col overflow-hidden overflow-x-hidden`}
    >
      <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
        <div className="flex flex-col gap-3">
          {hasSearchResults ? (
            <div className="flex flex-col gap-3">
              <h4 className="text-xl font-bold px-2 text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></span>
                Search Results
                {app?.search?.tracks?.total && (
                  <span className="text-sm text-zinc-400 font-normal">
                    ({app.search.tracks.items.length} /{" "}
                    {app.search.tracks.total})
                  </span>
                )}
              </h4>
              {app?.search?.tracks?.items.map((item, index) => (
                <SearchItems key={index} item={item} />
              ))}
              {/* Load more trigger */}
              {app?.search?.tracks?.next && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            hasTopTracks &&
            randomArtistName && (
              <div className="flex flex-col gap-3">
                <div className="sticky top-0 z-50 bg-gradient-to-b from-zinc-900/95 to-zinc-900/90 -mx-3 px-3 py-2 mb-1 flex items-center justify-between backdrop-blur-sm border-b border-zinc-800/50 overflow-x-hidden">
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-green-500 to-green-400 rounded-full"></span>
                    Top Tracks by {randomArtistName}
                  </h4>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={handleRefresh}
                    isLoading={isRefreshing}
                    className="text-zinc-400 hover:text-white transition-colors"
                    aria-label="Refresh top tracks"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </Button>
                </div>
                {app?.artistTopTracks?.tracks.map((item, index) => (
                  <SearchItems key={index} item={item} />
                ))}
              </div>
            )
          )}
        </div>
        <div className="hidden flex-col gap-2">
          {app.playlists?.items.length && app.playlists?.items.length > 0 && (
            <>
              <h4 className="text-xl font-bold pt-2 px-2 text-white">
                Xyrus10&apos;s Playlists
              </h4>
              {app?.playlists?.items.map((item, index) => (
                <PlaylistItems key={index} item={item} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(Sidebar);
