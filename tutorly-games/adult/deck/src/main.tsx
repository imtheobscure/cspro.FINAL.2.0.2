import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { syncThemeFromStorage } from "./lib/theme";

/*
 * Before render, not in an effect.
 *
 * The inline boot script in `index.html` has already set the attribute; this is the
 * belt-and-braces pass that makes the document agree with storage when the script was
 * skipped (a stripped build, or a host page that set `<html>` itself).
 */
syncThemeFromStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
