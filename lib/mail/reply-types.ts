export type ReplyKind = "reply" | "all" | "forward";
export interface OutgoingAttachment {
  name: string;
  contentType: "text/plain" | "text/calendar";
  dataBase64: string;
}
export interface ReplyDraft {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  html: string;
  attachments: OutgoingAttachment[];
}
export function extractAddress(value: string) {
  return value.match(/<([^>]+)>/)?.[1] || value.trim();
}
export function replyRecipients(
  source: { from: string; to?: string[]; cc?: string[] },
  identity: string,
  kind: ReplyKind,
) {
  const own = extractAddress(identity).toLowerCase(),
    from = extractAddress(source.from);
  const others = [
    ...new Set(
      [...(source.to || []), ...(source.cc || [])].map(extractAddress),
    ),
  ].filter(
    (v) => v.toLowerCase() !== own && v.toLowerCase() !== from.toLowerCase(),
  );
  return {
    to:
      kind === "forward"
        ? ""
        : from.toLowerCase() === own
          ? others.shift() || ""
          : from,
    cc: kind === "all" ? others.join(", ") : "",
  };
}
