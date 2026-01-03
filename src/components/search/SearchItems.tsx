"use client";

import { Image } from "@heroui/react";
import { Track } from "@/data/responseTypes";
import { addToQueue } from "@/data/layer/player";
import { useAddToQueue } from "@/data/layer/queue-client";
import { appStore } from "@/stores/AppStores";
import { useState } from "react";
import { useCurrentConvexUser } from "@/hooks/use-current-convex-user";
import { signIn } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
const SearchItems = ({ item }: { item: Track }) => {
  const { setRefreshQueue } = appStore();
  const { user, isAuthenticated } = useCurrentConvexUser();
  const { addToQueue: addToConvexQueue } = useAddToQueue();
  const queueSettings = useQuery(api.queue.getQueueSettings);

  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  return (
    <div
      className={`rounded-xl flex flex-row justify-between h-[85px] items-center hover:bg-zinc-800/70 active:bg-zinc-800 transition-all duration-200 cursor-pointer border border-transparent hover:border-zinc-700/50 group ${
        isLoading ? "opacity-50 cursor-not-allowed" : ""
      } ${isAdded ? "hidden" : ""}`}
      onClick={() => {
        if (isLoading) return;
        
        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          // Redirect to Google sign in
          signIn("google", { callbackUrl: "/" });
          return;
        }
        
        // Check if requests are accepted
        if (user.role === "user" && queueSettings?.isPaused) {
          alert("Requests are currently disabled");
          return;
        }
        
        setIsLoading(true);
        
        // Add to Spotify queue
        addToQueue({
          uri: item.uri,
        }).then(([response, error]) => {
          if (error) console.log(error);
          console.log(response);
          
          // Also add to Convex queue
          addToConvexQueue({
            track: item,
            userEmail: user.email,
          }).then((result) => {
            if (!result.success) {
              console.error("Failed to add to Convex queue:", result.error);
            }
          });
          
          setRefreshQueue(true);
          setIsAdded(true);
          setIsLoading(false);
        });
      }}
    >
      <div className="flex flex-row max-w-[calc(100%-80px)] items-center gap-3">
        <div className="relative">
          <Image
            alt="Card background"
            className="object-cover rounded-xl w-[80px] h-[80px] p-2 shadow-lg group-hover:shadow-xl transition-shadow duration-200"
            src={item.album.images[0].url}
            width={80}
            height={80}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden text-ellipsis min-w-0">
          <h4 className="font-bold text-lg overflow-hidden whitespace-nowrap text-ellipsis text-white group-hover:text-green-400 transition-colors duration-200">
            {item.name}
          </h4>
          <p className="text-sm text-zinc-400 mt-0.5 overflow-hidden whitespace-nowrap text-ellipsis">
            {item.artists.map((artist) => artist.name).join(", ")}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end justify-center pr-3">
        <p className="text-xs text-zinc-500 font-mono overflow-hidden whitespace-nowrap text-ellipsis">
          {Math.floor(item.duration_ms / 60000)}:
          {String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(
            2,
            "0",
          )}
        </p>
      </div>
    </div>
  );
};

export default SearchItems;
