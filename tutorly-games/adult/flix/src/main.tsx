import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

/**
 * Server-state cache. Flix's "server" is IndexedDB (see lib/api.ts), so the
 * defaults are tuned for that: a long stale time (nothing changes underneath us
 * except our own mutations, which invalidate explicitly) and one retry, because
 * a failed IndexedDB read is usually a private-mode restriction, not a blip.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
