import { authenticated, failure } from "@/lib/server";
import { z } from "zod";
const draft = z.object({
  id: z.string().uuid().optional(),
  to: z.string().max(2000),
  cc: z.string().max(2000).optional(),
  bcc: z.string().max(2000).optional(),
  subject: z.string().max(998),
  text: z.string().max(100000),
});
export async function GET(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const { data, error } = await db
      .from("mail_drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Cannot load drafts");
    return Response.json({ drafts: data });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const d = draft.parse(await req.json());
    if (d.id) {
      const { data, error } = await db
        .from("mail_drafts")
        .update({ ...d, updated_at: new Date().toISOString() })
        .eq("id", d.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw new Error("Cannot save draft");
      return Response.json({ draft: data });
    }
    const { data, error } = await db
      .from("mail_drafts")
      .insert({ ...d, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error("Cannot save draft");
    return Response.json({ draft: data });
  } catch (e) {
    return failure(e);
  }
}
