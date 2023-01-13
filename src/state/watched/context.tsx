import { MWMediaMeta, MWMediaType } from "@/backend/metadata/types";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { VideoProgressStore } from "./store";

interface WatchedStoreItem extends MWMediaMeta {
  progress: number;
  percentage: number;
}

export interface WatchedStoreData {
  items: WatchedStoreItem[];
}

interface WatchedStoreDataWrapper {
  updateProgress(media: MWMediaMeta, progress: number, total: number): void;
  getFilteredWatched(): WatchedStoreItem[];
  watched: WatchedStoreData;
}

export function getWatchedFromPortable(
  items: WatchedStoreItem[],
  media: MWMediaMeta
): WatchedStoreItem | undefined {
  return undefined;
}

const WatchedContext = createContext<WatchedStoreDataWrapper>({
  updateProgress: () => {},
  getFilteredWatched: () => [],
  watched: {
    items: [],
  },
});
WatchedContext.displayName = "WatchedContext";

export function WatchedContextProvider(props: { children: ReactNode }) {
  const watchedLocalstorage = VideoProgressStore.get();
  const [watched, setWatchedReal] = useState<WatchedStoreData>(
    watchedLocalstorage as WatchedStoreData
  );

  const setWatched = useCallback(
    (data: any) => {
      setWatchedReal((old) => {
        let newData = data;
        if (data.constructor === Function) {
          newData = data(old);
        }
        watchedLocalstorage.save(newData);
        return newData;
      });
    },
    [setWatchedReal, watchedLocalstorage]
  );

  const contextValue = useMemo(
    () => ({
      updateProgress(
        media: MWMediaMeta,
        progress: number,
        total: number
      ): void {
        // setWatched((data: WatchedStoreData) => {
        //   let item = getWatchedFromPortable(data.items, media);
        //   if (!item) {
        //     item = {
        //       mediaId: media.mediaId,
        //       mediaType: media.mediaType,
        //       providerId: media.providerId,
        //       title: media.title,
        //       year: media.year,
        //       percentage: 0,
        //       progress: 0,
        //       episodeId: media.episodeId,
        //       seasonId: media.seasonId,
        //     };
        //     data.items.push(item);
        //   }
        //   // update actual item
        //   item.progress = progress;
        //   item.percentage = Math.round((progress / total) * 100);
        //   return data;
        // });
      },
      getFilteredWatched() {
        // remove disabled providers
        // let filtered = watched.items.filter(
        //   (item) => getProviderMetadata(item.providerId)?.enabled
        // );
        let filtered = watched.items;

        // // get highest episode number for every anime/season
        const highestEpisode: Record<string, [number, number]> = {};
        const highestWatchedItem: Record<string, WatchedStoreItem> = {};
        filtered = filtered.filter((item) => {
          if ([MWMediaType.ANIME, MWMediaType.SERIES].includes(item.type)) {
            const key = `${item.type}-${item.id}`;
            const current: [number, number] = [
              item.episodeId ? parseInt(item.episodeId, 10) : -1,
              item.seasonId ? parseInt(item.seasonId, 10) : -1,
            ];
            let existing = highestEpisode[key];
            if (!existing) {
              existing = current;
              highestEpisode[key] = current;
              highestWatchedItem[key] = item;
            }
            if (
              current[0] > existing[0] ||
              (current[0] === existing[0] && current[1] > existing[1])
            ) {
              highestEpisode[key] = current;
              highestWatchedItem[key] = item;
            }
            return false;
          }
          return true;
        });
        return [...filtered, ...Object.values(highestWatchedItem)];
      },
      watched,
    }),
    [watched]
  );

  return (
    <WatchedContext.Provider value={contextValue as any}>
      {props.children}
    </WatchedContext.Provider>
  );
}

export function useWatchedContext() {
  return useContext(WatchedContext);
}
