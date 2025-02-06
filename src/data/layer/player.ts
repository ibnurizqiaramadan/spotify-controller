import { DataRequest, CustomDataResponse } from "@/data/helper";

export const getQueue = async ({
  accessToken,
}: {
  accessToken: string;
}): Promise<CustomDataResponse<"get:me/player/queue">> => {
  return DataRequest({
    url: "get:me/player/queue",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
