"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { isApiError } from "@/shared/api/api-error";
import { ToastProvider } from "@/shared/components/ui/toast";

const PROTECTED_PREFIXES = ["/dashboard", "/checkout"];

/** A session that expired mid-visit sends the user to sign in, then back where they were. */
function handleUnauthenticated(error: unknown) {
  if (!isApiError(error, 401) || typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    // A hard navigation is intended: it runs outside React (query cache callback) and drops stale client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthenticated }),
        mutationCache: new MutationCache({ onError: handleUnauthenticated }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Client errors (4xx) won't fix themselves on retry.
            retry: (count, error) => !(isApiError(error) && error.status < 500) && count < 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
