"use client";

import { SearchSpotify } from "@/data/layer/search";
import { Input } from "@heroui/react";
import { useCallback, useRef } from "react";
import { appStore } from "@/stores/AppStores";
import UserAvatar from "@/components/user/UserAvatar";

export default function Search() {
  const { setSearch, setSearchInput, app } = appStore((state) => state);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSearch = useCallback(
    async (query: string) => {
      const [response, error] = await SearchSpotify({
        query,
        limit: 20,
        offset: 0,
      });
      if (error) console.log("error", error);
      if (query.length > 1) {
        setSearch(response);
      } else {
        setSearch(null);
      }
    },
    [setSearch],
  );

  const debounceFetchSearch = (query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSearch(query);
    }, 200);
  };

  return (
    <div className="flex flex-grow items-center justify-center gap-4">
      <Input
        type="text"
        className="rounded-xl w-full md:w-1/2 lg:w-1/3 p-0 m-0"
        placeholder="Search songs, artists, albums..."
        defaultValue={app.searchInput}
        classNames={{
          input: "text-white placeholder:text-zinc-500",
          inputWrapper:
            "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 focus-within:border-green-500/50 shadow-lg backdrop-blur-sm transition-all duration-200",
        }}
        onKeyUp={(e) => {
          const value = e.currentTarget.value.trim().replace(/\s+/g, " ");
          setSearchInput(value);
          debounceFetchSearch(value);
        }}
      />
      <UserAvatar />
    </div>
  );
}
