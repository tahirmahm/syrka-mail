import { authenticated, connection, failure } from "@/lib/server";
import { listMailPage, sendMail, validateDraft } from "@/lib/providers";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    return Response.json(
      await listMailPage(await connection(req), {
        folder: params.get("folder") || "Inbox",
        query: params.get("query") || "",
        cursor: params.get("cursor") || undefined,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const d = await req.json();
    validateDraft(d);
    const id = z.string().uuid().parse(req.headers.get("idempotency-key"));
    const { db, user } = await authenticated(req);
    const c = await connection(req);
    const { error } = await db
      .from("mail_deliveries")
      .insert({ id, user_id: user.id, state: "sending" });
    if (error)
      throw new Error(
        "Delivery already attempted or could not be recorded. Check Sent before retrying.",
      );
    try {
      await sendMail(c, d);
    } catch {
      await db
        .from("mail_deliveries")
        .update({ state: "unknown" })
        .eq("id", id)
        .eq("user_id", user.id);
      throw new Error(
        "Delivery outcome is uncertain. Check your provider Sent folder before composing a new message.",
      );
    }
    const { error: receiptError } = await db
      .from("mail_deliveries")
      .update({ state: "accepted" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (receiptError)
      throw new Error(
        "Provider accepted the message, but the receipt could not be saved. Do not resend.",
      );
    return Response.json({ sent: true });
  } catch (e) {
    return failure(e);
  }
}
