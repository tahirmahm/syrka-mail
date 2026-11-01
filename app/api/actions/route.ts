import { createHash } from "node:crypto";
import { authenticated, failure } from "@/lib/server";
import { proposedAction } from "@/lib/actions";
export async function GET(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const { data, error } = await db
      .from("proposed_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Cannot load commitments");
    return Response.json({ actions: data });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const action = proposedAction.parse(await req.json());
    const { data: account } = await db
      .from("mail_connections")
      .select("id")
      .eq("id", action.sourceAccountId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!account) throw new Error("Source account is not authorized");
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          user.id,
          action.sourceAccountId,
          action.sourceMessageId,
          action.destination,
          action.title,
        ]),
      )
      .digest("hex");
    const { data, error } = await db
      .from("proposed_actions")
      .upsert(
        { user_id: user.id, payload: action, idempotency_key: key },
        { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
      )
      .select();
    if (error) throw new Error("Cannot propose action");
    return Response.json({ actions: data });
  } catch (e) {
    return failure(e);
  }
}
