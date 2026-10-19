"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

/**
 * SWR-backed hook for fetching the full user profile from /api/users/me.
 * 
 * Uses SWR's built-in deduplication so multiple components calling this hook
 * in the same render tree won't trigger duplicate network requests. Also
 * caches data across navigations so returning to a page is instant.
 * 
 * Use this instead of raw `fetch("/api/users/me")` in page components.
 */
export function useUserProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/users/me",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10s — prevent duplicate fetches during fast navigation
    }
  );

  return {
    userData: data?.data ?? null,
    error,
    isLoading,
    mutate,
  };
}
