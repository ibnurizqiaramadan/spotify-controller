export type CustomError = {
  statusCode: number;
  errors: {
    message: string;
    dbError?: string | null;
    error?: Error | string | null;
  };
} | null;

export type SpotifyUrl = {
  spotify: string;
};

export type Artist = {
  external_urls: SpotifyUrl;
  href: string;
  id: string;
  name: string;
  type: "artist";
  uri: string;
};

export type AlbumImage = {
  height: number;
  url: string;
  width: number;
};

export type Album = {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  external_urls: SpotifyUrl;
  href: string;
  id: string;
  images: AlbumImage[];
  is_playable: boolean;
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: "album";
  uri: string;
};

export type Track = {
  album: Album;
  artists: Artist[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc: string;
  };
  external_urls: SpotifyUrl;
  href: string;
  id: string;
  is_local: boolean;
  is_playable: boolean;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: "track";
  uri: string;
};

export type TracksResponse = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: Track[];
};

export type SearchResponse = {
  tracks: TracksResponse;
};

export type QueueResponse = {
  currently_playing: Track;
  queue: Track[];
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type Device = {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
  supports_volume: boolean;
};

export type DeviceResponse = {
  devices: Device[];
};

export type SpotifyNowPlaying = {
  device: Device;
  shuffle_state: boolean;
  smart_shuffle: boolean;
  repeat_state: string;
  timestamp: number;
  context: {
    external_urls: SpotifyUrl;
    href: string;
    type: string;
    uri: string;
  };
  progress_ms: number;
  item: Track;
  currently_playing_type: string;
  actions: {
    disallows: {
      pausing: boolean;
    };
  };
  is_playing: boolean;
};

export type SpotifyPlaylistResponse = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: SpotifyPlaylist[];
};

export type SpotifyPlaylist = {
  collaborative: boolean;
  description: string;
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: SpotifyUser;
  primary_color: string | null;
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    total: number;
  };
  type: string;
  uri: string;
};

export type SpotifyImage = {
  height: number;
  url: string;
  width: number;
};

export type SpotifyUser = {
  display_name: string;
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  type: string;
  uri: string;
};

export type ArtistTopTracksResponse = {
  tracks: Track[];
};
