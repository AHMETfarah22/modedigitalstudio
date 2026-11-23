/**
 * Prefixes a file in /public with the deploy base path.
 * Empty locally; "/modedigitalstudio" on GitHub Pages (set by the deploy workflow).
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => (path.startsWith("/") ? BASE + path : path);
