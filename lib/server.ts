import { publicSupabaseConfig } from "./supabase/config";
import { createClient } from "@supabase/supabase-js";
import type { Connection } from "./providers";
import { decrypt, encrypt } from "./crypto";
import { oauthConfig } from "./oauth";
export function database() {
  const { url } = publicSupabaseConfig();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Supabase server key is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
export async function authenticated(req: Request) {
  const db = database();
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Sign in required");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Sign in required");
  return { db, user: data.user };
}
export async function rateLimit(
  db: ReturnType<typeof database>,
  userId: string,
  bucket: string,
  limit = 60,
) {
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_user: userId,
    p_bucket: bucket,
    p_limit: limit,
  });
  if (error) throw new Error("Rate limiter is unavailable");
  if (!data) throw new Error("Rate limit reached. Please try again later.");
}
export async function connection(req: Request) {
  const { db, user } = await authenticated(req);
  await rateLimit(db, user.id, "mail");
  const id = new URL(req.url).searchParams.get("account");
  let q = db.from("mail_connections").select("*").eq("user_id", user.id);
  if (id) q = q.eq("id", id);
  const { data, error } = await q.order("created_at").limit(1).maybeSingle();
  if (error) throw new Error("Cannot load mail connection");
  if (!data) throw new Error("No email provider connected");
  let token = decrypt(data.access_token);
  if (data.expires_at && Date.parse(data.expires_at) < Date.now() + 60000) {
    if (!data.refresh_token) throw new Error("Provider reconnection required");
    const cfg = oauthConfig(data.provider);
    const response = await fetch(cfg.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "refresh_token",
        refresh_token: decrypt(data.refresh_token),
      }),
    });
    if (!response.ok) throw new Error("Provider reconnection required");
    const t = await response.json();
    token = t.access_token;
    const { error: updateError } = await db
      .from("mail_connections")
      .update({
        access_token: encrypt(token),
        refresh_token: t.refresh_token
          ? encrypt(t.refresh_token)
          : data.refresh_token,
        expires_at: new Date(
          Date.now() + Number(t.expires_in || 3600) * 1000,
        ).toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (updateError) throw new Error("Cannot persist refreshed credentials");
  }
  return { ...data, access_token: token } as Connection;
}
export function failure(e: unknown) {
  const message = e instanceof Error ? e.message : "Request failed";
  const status =
    message === "Sign in required"
      ? 401
      : message.startsWith("Rate limit")
        ? 429
        : 400;
  return Response.json({ error: message }, { status });
}

/** User-owned operations use the user's JWT and RLS, not service-role bypass. */
export async function userAuthenticated(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Sign in required");
  const { url, key } = publicSupabaseConfig();
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Sign in required");
  return { db, user: data.user };
}
