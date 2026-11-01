export const MAIL_PROJECT_REF = "grlbuiemvkmaflogryta";
export function publicSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error("Supabase public configuration is not configured");
  if (key.startsWith("sb_secret_"))
    throw new Error(
      "A server secret cannot be used as the public Supabase key",
    );
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1] || "", "base64url").toString(),
    );
    if (payload.role === "service_role")
      throw new Error(
        "A service-role key cannot be used as the public Supabase key",
      );
  } catch (e) {
    if (e instanceof Error && e.message.includes("cannot be used")) throw e;
  }
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !["", "/"].includes(parsed.pathname)
  )
    throw new Error(
      "Use the dedicated Supabase origin without credentials or paths",
    );
  const local =
    env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.hostname !== MAIL_PROJECT_REF + ".supabase.co" && !local)
    throw new Error(
      "Supabase project mismatch: only the dedicated Syrka Mail project is authorized",
    );
  if (parsed.protocol !== "https:" && !local)
    throw new Error("Supabase URL requires HTTPS");
  if (env.SUPABASE_PROJECT_REF && env.SUPABASE_PROJECT_REF !== MAIL_PROJECT_REF)
    throw new Error("Supabase project reference mismatch");
  return { url, key, projectRef: MAIL_PROJECT_REF };
}
