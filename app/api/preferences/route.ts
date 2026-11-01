import { z } from "zod";
import { userAuthenticated, failure } from "@/lib/server";
export async function GET(req: Request) {
  try {
    const { db, user } = await userAuthenticated(req);
    const { data, error } = await db
      .from("mail_preferences")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error)
      throw new Error(
        "Preferences are unavailable. Check the dedicated Mail migration.",
      );
    return Response.json(
      { preferences: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    const { db, user } = await userAuthenticated(req);
    const input = z
      .object({ theme: z.enum(["light", "dark"]) })
      .parse(await req.json());
    const { data, error } = await db
      .from("mail_preferences")
      .upsert({ user_id: user.id, ...input }, { onConflict: "user_id" })
      .select("theme")
      .single();
    if (error)
      throw new Error(
        "Cannot save private preferences. Check the dedicated Mail migration.",
      );
    return Response.json({ preferences: data });
  } catch (e) {
    return failure(e);
  }
}
