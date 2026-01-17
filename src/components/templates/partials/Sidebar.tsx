"use client";

import { appStore } from "@/stores/AppStores";
import SearchItems from "@/components/search/SearchItems";
import { memo, useEffect, useCallback, useState, useRef } from "react";
import { getPlaylists, getArtistTopTracks } from "@/data/layer/player";
import { SearchSpotify } from "@/data/layer/search";
import PlaylistItems from "@/components/sidebars/Playlistitems";
import { Button, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea, Switch, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentConvexUser } from "@/hooks/use-current-convex-user";
import { useGoogleAuth } from "@/providers/google-auth-provider";
import { Doc } from "../../../../convex/_generated/dataModel";

const Sidebar = () => {
  const { app, setPlaylists, setArtistTopTracks, setSearch } = appStore(
    (state) => state,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("top-tracks");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastSelectedArtistIdRef = useRef<string | null>(null);
  
  // Playlist CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Doc<"playlists"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", image: "", isPublic: false });

  // Get authenticated user and playlists
  const { user, isAuthenticated, isLoading } = useCurrentConvexUser();
  const { signIn: googleSignIn } = useGoogleAuth();
  const convexPlaylists = useQuery(
    api.playlists.getUserPlaylists,
    user ? { ownerId: user._id } : "skip"
  );
  
  // Playlist mutations
  const createPlaylist = useMutation(api.playlists.createPlaylist);
  const updatePlaylist = useMutation(api.playlists.updatePlaylist);
  const deletePlaylist = useMutation(api.playlists.deletePlaylist);

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setFormData({ name: "", description: "", image: "", isPublic: false });
    setIsModalOpen(true);
  };

  const openEditModal = (playlist: Doc<"playlists">) => {
    setEditingPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description || "",
      image: playlist.image || "",
      isPublic: playlist.isPublic,
    });
    setIsModalOpen(true);
  };

  const handleSubmitPlaylist = async () => {
    if (!formData.name.trim() || !user) return;
    setIsSubmitting(true);
    try {
      if (editingPlaylist) {
        await updatePlaylist({
          playlistId: editingPlaylist._id,
          name: formData.name,
          description: formData.description || undefined,
          image: formData.image || undefined,
          isPublic: formData.isPublic,
        });
      } else {
        await createPlaylist({
          name: formData.name,
          description: formData.description || undefined,
          image: formData.image || undefined,
          isPublic: formData.isPublic,
          ownerId: user._id,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save playlist:", error);
    }
    setIsSubmitting(false);
  };

  const handleDeletePlaylist = async (playlist: Doc<"playlists">) => {
    if (!confirm(`Delete "${playlist.name}"?`)) return;
    try {
      await deletePlaylist({ playlistId: playlist._id });
    } catch (error) {
      console.error("Failed to delete playlist:", error);
    }
  };

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
    <>
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
            <div className="flex flex-col gap-3">
              <div className="sticky top-0 z-50 bg-gradient-to-b from-zinc-900/95 to-zinc-900/90 -mx-3 px-3 py-2 mb-1 backdrop-blur-sm border-b border-zinc-800/50 overflow-x-hidden">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={(key) => setActiveTab(key as string)}
                  variant="underlined"
                  color="success"
                  classNames={{
                    tabList: "gap-4 w-full relative rounded-none p-0 border-b border-zinc-700/50",
                    cursor: "w-full bg-green-500",
                    tab: "max-w-fit px-0 h-10",
                    tabContent: "group-data-[selected=true]:text-green-400 text-zinc-400",
                  }}
                >
                  <Tab
                    key="top-tracks"
                    title={
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                        <span>Top Tracks</span>
                      </div>
                    }
                  />
                  <Tab
                    key="playlists"
                    title={
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                        <span>Playlists</span>
                      </div>
                    }
                                      />
                </Tabs>
              </div>

              {activeTab === "top-tracks" && (
                <>
                  {hasTopTracks && randomArtistName ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-sm text-zinc-400">
                          by <span className="text-green-400 font-medium">{randomArtistName}</span>
                        </p>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="default"
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
                            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
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
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                      <p className="text-sm">No top tracks available</p>
                      <p className="text-xs text-zinc-600">Play some music to see recommendations</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === "playlists" && (
                <div className="flex flex-col gap-3">
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      <p className="text-sm mb-3">Sign in to view your playlists</p>
                      <Button
                        color="success"
                        variant="flat"
                        size="sm"
                        onPress={googleSignIn}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </Button>
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {/* Create Playlist Button */}
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        onPress={openCreateModal}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white justify-start mb-2"
                        startContent={
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        }
                      >
                        Create Playlist
                      </Button>

                      {convexPlaylists && convexPlaylists.length > 0 ? (
                        convexPlaylists.map((playlist) => (
                          <div
                            key={playlist._id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                          >
                            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                              {playlist.image ? (
                                <img src={playlist.image} alt={playlist.name} className="w-full h-full object-cover rounded-md" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{playlist.name}</p>
                              <p className="text-xs text-zinc-400">{playlist.isPublic ? "Public" : "Private"}</p>
                            </div>
                            {/* Edit/Delete Dropdown */}
                            <Dropdown placement="bottom-end">
                              <DropdownTrigger>
                                <Button isIconOnly size="sm" variant="light" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu aria-label="Playlist actions">
                                <DropdownItem key="edit" onPress={() => openEditModal(playlist)}>Edit</DropdownItem>
                                <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDeletePlaylist(playlist)}>Delete</DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                          </svg>
                          <p className="text-sm">No playlists yet</p>
                          <p className="text-xs text-zinc-600">Create your first playlist</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Playlist Create/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        size="md"
        backdrop="blur"
        classNames={{
          base: "bg-zinc-900 text-white border border-zinc-800",
          header: "bg-zinc-900 border-b border-zinc-800",
          body: "py-6",
          footer: "bg-zinc-900 border-t border-zinc-800",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-xl font-semibold text-white">
            {editingPlaylist ? "Edit Playlist" : "Create Playlist"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-5">
              <Input
                label="Name"
                placeholder="Enter playlist name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
                classNames={{
                  label: "text-zinc-300 text-sm font-medium",
                  input: "bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700 focus:border-green-500",
                  inputWrapper: "bg-zinc-800 border-zinc-700 hover:border-zinc-600",
                }}
              />
              <Textarea
                label="Description"
                placeholder="Add an optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                minRows={3}
                classNames={{
                  label: "text-zinc-300 text-sm font-medium",
                  input: "bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700 focus:border-green-500",
                  inputWrapper: "bg-zinc-800 border-zinc-700 hover:border-zinc-600",
                }}
              />
              <Input
                label="Image URL"
                placeholder="https://example.com/image.jpg"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                classNames={{
                  label: "text-zinc-300 text-sm font-medium",
                  input: "bg-zinc-800 text-white placeholder:text-zinc-500 border-zinc-700 focus:border-green-500",
                  inputWrapper: "bg-zinc-800 border-zinc-700 hover:border-zinc-600",
                }}
              />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Visibility</p>
                  <p className="text-xs text-zinc-500">Make this playlist public</p>
                </div>
                <Switch
                  isSelected={formData.isPublic}
                  onValueChange={(isPublic) => setFormData({ ...formData, isPublic })}
                  classNames={{
                    wrapper: "group-data-[selected=true]:bg-green-600 group-data-[selected=true]:border-green-600",
                  }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              color="default"
              onPress={() => setIsModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              color="success" 
              onPress={handleSubmitPlaylist} 
              isLoading={isSubmitting} 
              isDisabled={!formData.name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {editingPlaylist ? "Save Changes" : "Create Playlist"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default memo(Sidebar);
