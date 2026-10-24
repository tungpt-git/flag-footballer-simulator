"use client";

import { useCallback, useEffect, useState } from "react";

export type AsyncResource<T> = {
  data: T;
  isLoading: boolean;
  errorMessage: string | null;
  /** Fetches the resource again. */
  refresh: () => void;
};

/** Loads a resource once on mount and again whenever `refresh` is called. */
export const useAsyncResource = <T>(fetchResource: () => Promise<T>, initialData: T): AsyncResource<T> => {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let isCancelled = false;

    const load = async (): Promise<void> => {
      try {
        const loaded = await fetchResource();
        if (isCancelled) return;
        setData(loaded);
        setErrorMessage(null);
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load data");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isCancelled = true;
    };
  }, [fetchResource, reloadToken]);

  return { data, isLoading, errorMessage, refresh };
};
