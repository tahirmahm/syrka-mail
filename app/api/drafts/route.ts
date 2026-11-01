import { userAuthenticated, failure } from "@/lib/server";
import { limitedJson } from "@/lib/mail/json";
import { checkedAttachments, sanitizeReplyHtml } from "@/lib/mail/replies";
import { z } from "zod";
const draft = z.object({
  id: z.string().uuid().optional(),
  to: z.string().max(2000),
  cc: z.string().max(2000).optional(),
  bcc: z.string().max(2000).optional(),
  subject: z.string().max(998),
  text: z.string().max(100000),
  html: z.string().max(200000).optional(),
  attachments: z.unknown().optional(),
  reply_context: z
    .object({
      accountId: z.string().uuid(),
      sourceMessageId: z.string().max(500),
      kind: z.enum(["reply", "all", "forward"]),
    })
    .optional(),
});
export async function GET(req: Request) {
  try {
    const { db, user } = await userAuthenticated(req);
    const params = new URL(req.url).searchParams;
    let query = db.from("mail_drafts").select("*").eq("user_id", user.id);
    if (params.get("account"))
      query = query.eq("reply_context->>accountId", params.get("account"));
    if (params.get("source"))
      query = query.eq("reply_context->>sourceMessageId", params.get("source"));
    const { data, error } = await query
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
    const { db, user } = await userAuthenticated(req);
    const d = draft.parse(await limitedJson(req));
    if (d.attachments) d.attachments = checkedAttachments(d.attachments);
    if (d.html) d.html = sanitizeReplyHtml(d.html);
    if (d.reply_context) {
      const { data: account } = await db.rpc("owns_mail_account", {
        p_account_id: d.reply_context.accountId,
      });
      if (!account) throw new Error("Draft account is not authorized");
    }
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
