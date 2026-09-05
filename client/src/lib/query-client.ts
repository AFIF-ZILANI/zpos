import { QueryClient } from "@tanstack/react-query";

/**
 * Shared client. This used to be constructed inline in App.tsx with library
 * defaults, which meant cached pages were thrown away after 5 minutes and every
 * navigation re-fetched from scratch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // POS data changes often, but not within a few seconds of itself. This
      // is what stops a back-and-forth between two pages from re-requesting
      // everything each time.
      staleTime: 30_000,
      // Keep evicted-from-view data around long enough that returning to a
      // page renders instantly from cache while any refetch happens behind it.
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
