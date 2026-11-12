/**
 * Where the model API lives. On Vercel it shares the site's domain: vercel.json routes
 * /api/* to the FastAPI service, so the default (empty) means "this site".
 * Set NEXT_PUBLIC_API_URL only to use an API on another address, e.g. http://localhost:8000.
 */
const ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** Full URL of an API route, e.g. apiUrl("/predict"). */
export function apiUrl(path: string): string {
  return `${ORIGIN}/api${path}`;
}

/** Makes a link returned by the API (like "/api/audio?...") usable from the browser. */
export function apiLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  return ORIGIN && link.startsWith("/") ? ORIGIN + link : link;
}
