import { createBrowserClient } from "@supabase/ssr";
/** Browser-readable cookie session, following the official SSR integration. Not HttpOnly E2EE. */
export function browserSupabase(url: string, key: string) {
  return createBrowserClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: false },
    cookieOptions: {
      sameSite: "lax",
      secure:
        typeof window !== "undefined" && window.location.protocol === "https:",
    },
  });
}
