"use client";

import { Image } from "@heroui/react";
import { Track } from "@/data/responseTypes";
const QueueItem = ({
  item,
  currentPlaying = false,
}: {
  item: Track;
  currentPlaying?: boolean;
}) => {
  return (
    <div className="rounded-xl flex flex-row h-[85px] items-center hover:bg-zinc-800/60 active:bg-zinc-800 transition-all duration-200 border border-transparent hover:border-zinc-700/30 group">
      <div className="relative">
        <Image
          alt="Card background"
          className="object-cover rounded-xl w-[80px] h-[80px] min-w-[80px] min-h-[80px] p-2 shadow-md group-hover:shadow-lg transition-shadow duration-200"
          src={item.album.images[0].url}
          width={80}
          height={80}
        />
        {currentPlaying && (
          <div className="absolute bottom-3 right-3 w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
        )}
      </div>
      <div className="flex flex-col max-w-[calc(100%-80px)] overflow-hidden text-ellipsis py-2 px-2 min-w-0">
        <h4
          className={`font-bold text-lg overflow-hidden whitespace-nowrap text-ellipsis px-1 transition-colors duration-200 ${
            currentPlaying
              ? "text-green-400"
              : "text-white group-hover:text-zinc-200"
          }`}
        >
          {item.name}
        </h4>
        <p className="text-sm text-zinc-400 overflow-hidden whitespace-nowrap text-ellipsis px-1 mt-0.5">
          {item.artists.map((artist) => artist.name).join(", ")}
        </p>
      </div>
    </div>
  );
};

export default QueueItem;
