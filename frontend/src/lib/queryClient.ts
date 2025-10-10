// Centralized React Query client with caching policies.

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,         // 1 min fresh by default
      gcTime: 6 * 60 * 60 * 1000,   // keep cache for 6h
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
