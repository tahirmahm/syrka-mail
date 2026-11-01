import { configurationStatus } from "@/lib/config";
import { publicSupabaseConfig } from "@/lib/supabase/config";
export async function GET() {
  let publicAuth: {
    url: string;
    anonKey: string;
    publishableKey: string;
  } | null = null;
  try {
    const { url, key } = publicSupabaseConfig();
    publicAuth = { url, anonKey: key, publishableKey: key };
  } catch {}
  return Response.json(
    { ...configurationStatus(), publicAuth },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
