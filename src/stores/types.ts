import {
  SearchResponse,
  QueueResponse,
  DeviceResponse,
  SpotifyNowPlaying,
  SpotifyPlaylistResponse,
  ArtistTopTracksResponse,
} from "@/data/responseTypes";

export type AppStore = {
  app: {
    search: SearchResponse | null;
    searchInput: string;
    queue: QueueResponse | null;
    refreshQueue: boolean;
    devices: DeviceResponse | null;
    selectedDevice: string | null;
    nowPlaying: SpotifyNowPlaying | null;
    isSidebarVisible: boolean;
    playlists: SpotifyPlaylistResponse | null;
    artistTopTracks: ArtistTopTracksResponse | null;
  };
  setSearch: (search: SearchResponse | null) => void;
  setSearchInput: (searchInput: string) => void;
  setQueue: (queue: QueueResponse | null) => void;
  setNowPlaying: (nowPlaying: SpotifyNowPlaying | null) => void;
  setSearchResults: (searchResults: SearchResponse | null) => void;
  setRefreshQueue: (refreshQueue: boolean) => void;
  setDevices: (devices: DeviceResponse | null) => void;
  setSelectedDevice: (selectedDevice: string | null) => void;
  setIsSidebarVisible: (isSidebarVisible: boolean) => void;
  setPlaylists: (playlists: SpotifyPlaylistResponse | null) => void;
  setArtistTopTracks: (artistTopTracks: ArtistTopTracksResponse | null) => void;
};
