"use client";

import { useCallback, useEffect } from "react";
import {
  Autocomplete,
  AutocompleteSection,
  AutocompleteItem,
} from "@heroui/autocomplete";

import { getDevices } from "@/data/layer/player";
import { appStore } from "@/stores/AppStores";

export default function ListDevice() {
  const { app, setDevices, setSelectedDevice } = appStore((state) => state);

  const fetchDevices = useCallback(async () => {
    const [response, error] = await getDevices();
    if (error) {
      console.log(error);
    }
    setDevices(response);
    console.log(response);
    if (response?.devices?.length && response?.devices?.length > 0) {
      setSelectedDevice(response?.devices[0].id ?? null);
    }
  }, [setDevices, setSelectedDevice]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return (
    <div className="flex flex-row gap-2 items-center p-3">
      {app?.devices && (
        <>
          <h1 className="text-large">Devices</h1>
          <Autocomplete
            defaultItems={app?.devices?.devices}
            defaultSelectedKey={app?.selectedDevice ?? undefined}
          >
            <AutocompleteSection>
              {app?.devices &&
                app.devices.devices.map((device) => (
                  <AutocompleteItem key={device.id}>
                    {device.name}
                  </AutocompleteItem>
                ))}
            </AutocompleteSection>
          </Autocomplete>
        </>
      )}
    </div>
  );
}
