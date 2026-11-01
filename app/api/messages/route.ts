import { connection, failure } from "@/lib/server";
import { createAdapter } from "@/lib/mail/adapter";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const adapter = createAdapter(await connection(req));
    const id = new URL(req.url).searchParams.get("id");
    return Response.json(
      id
        ? { message: await adapter.read(id) }
        : { capabilities: [...adapter.capabilities] },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request) {
  try {
    const d = z
      .object({
        id: z.string().min(1).max(500),
        operation: z.enum(["archive", "trash", "markRead", "star"]),
        enabled: z.boolean(),
      })
      .parse(await req.json());
    const adapter = createAdapter(await connection(req));
    if (!adapter.capabilities.has(d.operation))
      throw new Error("Provider does not currently support this operation");
    await adapter.mutate(d.id, d.operation, d.enabled);
    return Response.json({ updated: true });
  } catch (e) {
    return failure(e);
  }
}
