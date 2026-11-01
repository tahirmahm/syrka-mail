import { authenticated, failure } from "@/lib/server";
export async function GET(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const { data, error } = await db
      .from("mail_connections")
      .select("id,provider,address,created_at,expires_at")
      .eq("user_id", user.id);
    if (error) throw new Error("Cannot load connections");
    return Response.json({ accounts: data });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new Error("Account ID is required");
    const { error } = await db
      .from("mail_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error("Cannot disconnect account");
    return Response.json({
      disconnected: true,
      notice:
        "Local credentials deleted. Revoke Syrka Mail access in provider settings to invalidate provider grants.",
    });
  } catch (e) {
    return failure(e);
  }
}
