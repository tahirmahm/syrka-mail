import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw))
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hex key");
  return Buffer.from(raw, "hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decrypt(value: string) {
  const [iv, tag, body] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  if (!iv || !tag || !body) throw new Error("Invalid encrypted credential");
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
