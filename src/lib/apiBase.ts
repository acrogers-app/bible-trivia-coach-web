/**
 * API base URL for /api/* fetches.
 *
 * On the web this is empty (same-origin relative URLs). In the Capacitor
 * mobile build the app ships as static files with no server, so
 * NEXT_PUBLIC_API_BASE points at the deployed backend
 * (e.g. https://bible-trivia-coach-web.vercel.app).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
