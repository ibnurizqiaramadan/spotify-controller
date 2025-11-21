"use client";

import Sidebar from "@/components/templates/partials/Sidebar";
import Queue from "@/components/templates/partials/Queue";
import Controls from "@/components/templates/partials/Controls";
import Search from "@/components/search/Search";
import { HeroUIProvider } from "@heroui/react";
import { appStore } from "@/stores/AppStores";
import { useEffect } from "react";
export default function Layout() {
  const { app, setIsSidebarVisible } = appStore((state) => state);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarVisible(!(window.innerWidth <= 768));
    };
    window.addEventListener("resize", handleResize);

    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setIsSidebarVisible]);

  return (
    <HeroUIProvider className="h-dvh select-none overflow-hidden">
      <div className="flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-950 to-black rounded-xl h-full p-4 gap-y-4 shadow-2xl overflow-hidden">
        <div className="flex-shrink-0">
          <Search />
        </div>
        <div
          className={`flex flex-row gap-4 rounded-lg flex-1 min-h-0 overflow-hidden ${
            app.isSidebarVisible ? "" : ""
          }`}
        >
          <div
            className={`flex-grow md:block md:w-1/2 ${
              (app.search?.tracks?.items.length ?? 0 > 0) ||
              (app.artistTopTracks?.tracks?.length ?? 0 > 0)
                ? "flex w-full"
                : "hidden"
            }`}
          >
            <Sidebar />
          </div>
          <div
            className={`flex-grow w-full sm:w-1/2 md:w-1/2 lg:w-1/4 ${
              app.isSidebarVisible === false &&
              (app.search?.tracks?.items.length ?? 0) > 0
                ? "hidden"
                : ""
            }`}
          >
            <Queue />
          </div>
        </div>
        <div className="flex-shrink-0">
          <Controls />
        </div>
      </div>
    </HeroUIProvider>
  );
}
