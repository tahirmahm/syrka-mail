import { z } from "zod";
import { authenticated, connection, failure } from "@/lib/server";
import { createAdapter } from "@/lib/mail/adapter";
import { checkedAttachments, sendProviderReply } from "@/lib/mail/replies";
import { limitedJson } from "@/lib/mail/json";
const requestInput = z.object({
  sourceMessageId: z.string().min(1).max(500),
  kind: z.enum(["reply", "all", "forward"]),
  text: z.string().max(100000),
  html: z.string().max(200000).optional(),
  to: z.string().max(2000).optional(),
  cc: z.string().max(2000).optional(),
  bcc: z.string().max(2000).optional(),
  attachments: z.unknown().optional(),
  draftId: z.string().uuid().optional(),
});
export async function POST(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const c = await connection(req);
    const input = requestInput.parse(await limitedJson(req));
    const attachments = checkedAttachments(input.attachments);
    const source = await createAdapter(c).read(input.sourceMessageId);
    if (c.provider === "zoho")
      throw new Error(
        "Native Zoho reply support is unavailable until its threading contract is verified",
      );
    const id = z.string().uuid().parse(req.headers.get("idempotency-key"));
    const { error } = await db
      .from("mail_deliveries")
      .insert({ id, user_id: user.id, state: "sending" });
    if (error)
      throw new Error(
        "Reply already attempted or could not be recorded. Check Sent before retrying.",
      );
    try {
      await sendProviderReply(c, source, { ...input, attachments }, input.kind);
    } catch {
      await db
        .from("mail_deliveries")
        .update({ state: "unknown" })
        .eq("id", id)
        .eq("user_id", user.id);
      throw new Error(
        "Reply outcome is uncertain. Check provider Sent and Drafts before retrying.",
      );
    }
    const { error: receiptError } = await db
      .from("mail_deliveries")
      .update({ state: "accepted" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (receiptError)
      throw new Error(
        "Reply accepted, but receipt persistence failed. Do not resend.",
      );
    if (input.draftId && c.id)
      await db
        .from("mail_drafts")
        .delete()
        .eq("id", input.draftId)
        .eq("user_id", user.id)
        .eq("reply_context->>accountId", c.id)
        .eq("reply_context->>sourceMessageId", input.sourceMessageId);
    return Response.json({ sent: true });
  } catch (e) {
    return failure(e);
  }
}
