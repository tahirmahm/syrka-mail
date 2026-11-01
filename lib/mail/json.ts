export async function limitedJson(req: Request, maxBytes = 8 * 1024 * 1024) {
  if (Number(req.headers.get("content-length")) > maxBytes)
    throw new Error("Request exceeds the upload limit");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Request body is required");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error("Request exceeds the upload limit");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
