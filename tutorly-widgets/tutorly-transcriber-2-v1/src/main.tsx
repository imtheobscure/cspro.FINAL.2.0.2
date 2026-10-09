import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Capture PWA install prompt at module level (before React mounts)
(window as any).__deferredPWAPrompt = null;
window.addEventListener("beforeinstallprompt", (e: Event) => {
  e.preventDefault();
  (window as any).__deferredPWAPrompt = e;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
