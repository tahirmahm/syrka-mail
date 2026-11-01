import { authenticated, failure } from "@/lib/server";
import { canTransition } from "@/lib/actions";
import { z } from "zod";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, user } = await authenticated(req);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { state } = z
      .object({ state: z.enum(["approved", "dismissed"]) })
      .parse(await req.json());
    const { data: current } = await db
      .from("proposed_actions")
      .select("state")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!current || !canTransition(current.state, state))
      throw new Error("Invalid action transition");
    const { data, error } = await db
      .from("proposed_actions")
      .update({ state, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("state", current.state)
      .select()
      .single();
    if (error) throw new Error("Action changed; refresh and retry");
    return Response.json({
      action: data,
      notice:
        "Approval is saved. Destination execution awaits an authorized integration contract.",
    });
  } catch (e) {
    return failure(e);
  }
}
