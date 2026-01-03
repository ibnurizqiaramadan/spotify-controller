declare namespace NodeJS {
  interface ProcessEnv {
    SPOTIFY_CLIENT_ID: string;
    SPOTIFY_CLIENT_SECRET: string;
    SPOTIFY_REFRESH_TOKEN: string;
    SPOTIFY_AUTH_BASE_URL: string;
    SPOTIFY_API_BASE_URL_V1: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_DB: string;
    NEXT_PUBLIC_CONVEX_URL: string;
    CONVEX_SELF_HOSTED_URL: string;
    CONVEX_SELF_HOSTED_ADMIN_KEY: string;
  }
}
