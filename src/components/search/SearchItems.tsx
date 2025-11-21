"use client";

import { Image } from "@heroui/react";
import { Track } from "@/data/responseTypes";
import { addToQueue } from "@/data/layer/player";
import { appStore } from "@/stores/AppStores";
import { useState } from "react";
const SearchItems = ({ item }: { item: Track }) => {
  const { setRefreshQueue } = appStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  return (
    <div
      className={`rounded-lg flex flex-row justify-between h-[80px] items-center hover:bg-zinc-800 transition-all duration-300 cursor-pointer ${
        isLoading ? "opacity-50" : ""
      } ${isAdded ? "hidden" : ""}`}
      onClick={() => {
        if (isLoading) return;
        setIsLoading(true);
        addToQueue({
          uri: item.uri,
        }).then(([response, error]) => {
          if (error) console.log(error);
          console.log(response);
          setRefreshQueue(true);
          setIsAdded(true);
          setIsLoading(false);
        });
      }}
    >
      <div className="flex flex-row max-w-[calc(100%-80px)] items-center gap-2">
        <Image
          alt="Card background"
          className="object-cover rounded-xl w-[80px] h-[80px] p-2"
          src={item.album.images[0].url}
          width={80}
          height={80}
        />
        <div className="flex flex-col overflow-hidden text-ellipsis">
          <h4 className="font-bold text-large overflow-hidden whitespace-nowrap text-ellipsis">
            {item.name}
          </h4>
          <p className="">
            {item.artists.map((artist) => artist.name).join(", ")}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <p className="text-sm text-zinc-400 overflow-hidden whitespace-nowrap text-ellipsis px-3">
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
