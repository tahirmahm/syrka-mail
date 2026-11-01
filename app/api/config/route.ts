import { configurationStatus } from "@/lib/config";
export async function GET() {
  return Response.json(
    {
      ...configurationStatus(),
      publicAuth:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? {
              url: process.env.NEXT_PUBLIC_SUPABASE_URL,
              anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            }
          : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
