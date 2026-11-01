import { connection, failure } from "@/lib/server";
import { z } from "zod";
const MAX_SIZE = 10 * 1024 * 1024;
export async function GET(req: Request) {
  try {
    const c = await connection(req);
    const p = new URL(req.url).searchParams;
    const id = z.string().min(1).max(500).parse(p.get("message")),
      attachment = z.string().min(1).max(500).parse(p.get("attachment"));
    if (c.provider === "zoho")
      throw new Error("Zoho attachment download is not implemented");
    const path = `/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachment)}`;
    const url =
      c.provider === "gmail"
        ? `https://gmail.googleapis.com/gmail/v1/users/me${path}`
        : `https://graph.microsoft.com/v1.0/me${path}/$value`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${c.access_token}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok)
      throw new Error("Attachment is unavailable or access was revoked");
    if (
      Number(r.headers.get("content-length")) >
      MAX_SIZE * (c.provider === "gmail" ? 1.5 : 1)
    )
      throw new Error("Attachment exceeds 10 MB download limit");
    const reader = r.body?.getReader();
    if (!reader) throw new Error("Attachment has no body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_SIZE * (c.provider === "gmail" ? 1.5 : 1)) {
        await reader.cancel();
        throw new Error("Attachment exceeds download limit");
      }
      chunks.push(next.value);
    }
    let data: Buffer = Buffer.concat(chunks);
    if (c.provider === "gmail") {
      const d = JSON.parse(data.toString());
      data = Buffer.from(d.data, "base64url");
    }
    if (data.length > MAX_SIZE)
      throw new Error("Attachment exceeds 10 MB download limit");
    const name = (p.get("name") || "attachment")
      .replace(/[\r\n\x00-\x1f]/g, "")
      .slice(0, 200);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
