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
    <HeroUIProvider className="h-dvh select-none">
      <div className="flex flex-col justify-center bg-zinc-950 rounded-lg h-full p-3 gap-y-3">
        <Search />
        <div
          className={`flex flex-row gap-3 ${
            app.isSidebarVisible ? "" : ""
          } rounded-lg h-full`}
        >
          <div
            className={`flex-grow md:block md:w-1/2 ${
              (app.search?.tracks?.items.length ?? 0 > 0)
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
        <Controls />
      </div>
    </HeroUIProvider>
  );
}
