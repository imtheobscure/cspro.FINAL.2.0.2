/**
 * URL for a file in `public/`.
 *
 * The game is served from a sub-path (https://cspro.tutomy.com/runner), so
 * public assets must be resolved against the document URL rather than the site
 * root. `document.baseURI` is the deployed index.html, which keeps this correct
 * at the root, under a sub-path, or on a local preview server.
 */
export function assetUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ""), document.baseURI).href;
}
