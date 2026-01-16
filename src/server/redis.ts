"use server";

import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_PASS
    ? `redis://:${process.env.REDIS_PASS}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    : `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  database: Number(process.env.REDIS_DB),
});

// Connect to Redis when the module is imported
redis.connect().catch(console.error);

redis.on("error", (err) => {
  console.error("Redis error", err);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting");
});

// Wrap the Redis client in an async function that ensures connection
export async function getRedisClient() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}
