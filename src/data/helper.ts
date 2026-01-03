"use server";

import { CustomError } from "@/data/responseTypes";
import { getAPIPathMap } from "@/data/apiRoutes";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Represents the available API paths.
 * @typedef {`${API_VERSION}:${API_PATH_FOR_VERSION<API_VERSION>}`} API_PATH
 */
type API_VERSION = keyof ReturnType<typeof getAPIPathMap>;
type API_PATH_FOR_VERSION<V extends API_VERSION> = keyof ReturnType<
  typeof getAPIPathMap
>[V];
type API_PATH = `${API_VERSION}:${API_PATH_FOR_VERSION<API_VERSION>}`;

/**
 * Represents the response type for a given API path.
 * @template S The API path string literal type
 */
type DataHelperResponse<S extends API_PATH> = ReturnType<
  typeof getAPIPathMap
>[S extends `${infer V}:${string}` ? V : never][S extends `${string}:${infer P}`
  ? P
  : never]["response"];

type FetchMethods =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

/**
 * Options for making a request.
 * @interface RequestOptions
 * @property {API_PATH} url - The API endpoint to request.
 * @property {FetchMethods} [method='GET'] - The HTTP method to use.
 * @property {Record<string, string>} [body] - The body of the request.
 * @property {Record<string, string>} [query] - Query parameters for the request.
 * @property {Record<string, string>} [params] - URL parameters for the request.
 * @property {Record<string, string>} [headers] - Custom headers for the request.
 * @property {boolean} [useCache=false] - Whether to use caching.
 * @property {string} [cacheKey] - The cache key for the request.
 * @property {string} [revalidateKey] - The revalidate key for the request.
 * @property {number} [revalidateTime=60] - The revalidate time for the request.
 * @property {(data: DataHelperResponse<URL> | null) => void} [response] - The response function for the request.
 * @property {(time: number) => void} [responseTime] - The response time for the request.
 */
interface RequestOptions<URL extends API_PATH> {
  url: URL;
  method?: FetchMethods;
  body?: Record<string, string>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  useCache?: boolean;
  cacheKey?: string;
  revalidateKey?: string;
  revalidateTime?: number;
  response?: (data: DataHelperResponse<URL> | null) => void;
  responseTime?: (time: number) => void;
}

/**
 * Custom data response type.
 * @template T The API path type
 * @property {DataHelperResponse<T> | null} data - The response data.
 * @property {CustomError | null} error - The error.
 * @property {number | null} responseTime - The response time.
 */
export type CustomDataResponse<T extends API_PATH> = [
  DataHelperResponse<T> | null,
  CustomError | null,
  number | null,
];

/**
 * Makes an API request.
 * @template URL
 * @param {RequestOptions} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
async function fetchAPI<URL extends API_PATH>({
  url,
  headers = {},
  query = {},
  params = {},
  body = {},
}: RequestOptions<URL>): Promise<CustomDataResponse<URL>> {
  try {
    const version = url.split(":")[0];
    const method = url.split(":")[1];
    const apiPath = url.split(":").slice(2).join(":");
    const parsedUrl = apiPath.replace(/:(\w+)/g, (_, param) => {
      return params[param] || `:${param}`;
    });
    const apiUrl = process.env[`SPOTIFY_API_BASE_URL_${version.toUpperCase()}`];
    const queryString = new URLSearchParams(query).toString();
    const fullUrl =
      apiPath === "api/token"
        ? `https://accounts.spotify.com/api/token`
        : `${apiUrl}/${parsedUrl}${queryString ? `?${queryString}` : ""}`;

    const startTime = Date.now();

    const response = await fetch(fullUrl, {
      method,
      headers: {
        "User-Agent": `spotify-bot-${process.env.NODE_ENV}`,
        ...headers,
      },
      ...(method.toLocaleLowerCase() !== "get" && {
        body:
          headers["Content-Type"] === "application/x-www-form-urlencoded"
            ? new URLSearchParams(body).toString()
            : JSON.stringify(body),
      }),
    });

    // Check if the response is OK (status in the range 200-299)
    if (!response.ok) {
      const errorText = await response.text(); // Get the error response text
      let parsedError;

      // Check if errorText is JSON
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { message: errorText }; // Fallback to plain text error
      }

      console.error(
        ` ${method} ${fullUrl} - Error: ${response.status} - ${parsedError.message}`,
      );
      return [
        null,
        {
          statusCode: response.status,
          errors: parsedError,
        } as CustomError,
        null,
      ];
    }

    // Attempt to parse the response as JSON
    let data: DataHelperResponse<URL> | null = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType && contentType.includes("application/json")) {
      data = (await response.json()) as DataHelperResponse<URL>;
    } else {
      data = await response.text();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.info(` API : ${method} ${fullUrl} - ${duration}ms`);

    return [data, null, duration];
  } catch (error) {
    console.log(error);
    return [null, error as CustomError, null];
  }
}

/**
 * Makes an API request with caching and revalidation.
 * @template URL
 * @param {RequestOptions} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
async function request<URL extends API_PATH>(
  options: RequestOptions<URL>,
): Promise<CustomDataResponse<URL>> {
  const {
    method = "get",
    useCache = false,
    cacheKey = "",
    revalidateKey = "",
    revalidateTime = 60,
  } = options;
  if (revalidateKey !== "") revalidateTag(revalidateKey, {});
  if (useCache && method === "get") {
    const key =
      cacheKey === ""
        ? `${options.url}-${JSON.stringify(options.query || {})}`
        : cacheKey;

    return unstable_cache(
      () => {
        console.log("key", key);
        return fetchAPI<URL>(options);
      },
      [key],
      {
        revalidate: revalidateTime,
        tags: [key],
      },
    )();
  }

  return fetchAPI<URL>(options);
}

/**
 * Makes a GET request.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
export const get = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> =>
  request<URL>({ ...options, method: "GET" });

/**
 * Makes a POST request.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
export const post = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> =>
  request<URL>({ ...options, method: "POST" });

/**
 * Makes a PUT request.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
export const put = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> =>
  request<URL>({ ...options, method: "PUT" });

/**
 * Makes a DELETE request.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
export const del = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> =>
  request<URL>({ ...options, method: "DELETE" });

/**
 * Makes a PATCH request.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 */
export const patch = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> =>
  request<URL>({ ...options, method: "PATCH" });

/**
 * Makes an API request with automatic method selection.
 * @template URL
 * @param {Omit<RequestOptions, 'method'>} options - The options for the request.
 * @returns {Promise<CustomDataResponse<URL>>} The response data and error.
 * @property {(data: DataHelperResponse<URL> | null) => void} [response] - The response function for the request.
 * @property {(time: number) => void} [responseTime] - The response time for the request.
 * @property {boolean} [useCache=false] - Whether to use caching.
 * @property {string} [cacheKey] - The cache key for the request.
 * @property {string} [revalidateKey] - The revalidate key for the request.
 * @property {number} [revalidateTime=60] - The revalidate time for the request in seconds.
 */
export const DataRequest = async <URL extends API_PATH>(
  options: Omit<RequestOptions<URL>, "method">,
): Promise<CustomDataResponse<URL>> => {
  const method = options.url.split(":")[1] as FetchMethods;
  const [data, error, responseTime] = await request<URL>({
    ...options,
    method,
  });
  if (options.response) options.response(data);
  if (options.responseTime) options.responseTime(responseTime ?? 0);
  return [data, error, responseTime];
};
