import { randomBytes } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { type Connection, type Message, validateDraft } from "../providers";
import type { ReplyDraft, ReplyKind, OutgoingAttachment } from "./reply-types";
import { replyRecipients } from "./reply-types";
export const attachmentInput = z.object({
  name: z
    .string()
    .min(1)
    .max(150)
    .refine((s) => !/[\r\n\x00/\\]/.test(s)),
  contentType: z.enum(["text/plain", "text/calendar"]),
  dataBase64: z
    .string()
    .max(1398104)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/),
});
export function checkedAttachments(input: unknown): OutgoingAttachment[] {
  const files = z
    .array(attachmentInput)
    .max(5)
    .parse(input || []);
  for (const file of files) {
    const content = Buffer.from(file.dataBase64, "base64");
    if (
      content.length > 1024 * 1024 ||
      content.toString("base64") !== file.dataBase64
    )
      throw new Error("Attachment encoding or per-file size is invalid");
    if (
      (file.contentType === "text/plain" && !/\.txt$/i.test(file.name)) ||
      (file.contentType === "text/calendar" && !/\.ics$/i.test(file.name))
    )
      throw new Error(
        "Use .txt or .ics attachments until the scanning pipeline is configured",
      );
  }
  if (
    files.reduce((n, a) => n + Buffer.from(a.dataBase64, "base64").length, 0) >
    5 * 1024 * 1024
  )
    throw new Error("Attachments exceed 5 MB");
  return files;
}
export function sanitizeReplyHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "div", "br", "strong", "b", "em", "i", "ul", "ol", "li"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}
const folded = (value: string) =>
  Buffer.from(value)
    .toString("base64")
    .match(/.{1,76}/g)
    ?.join("\r\n") || "";
function messageId(value?: string) {
  if (
    !value ||
    !/^<[^<>\s]{1,300}>$/.test(value) ||
    /[\x00-\x20\x7f-\uffff]/.test(value)
  )
    throw new Error(
      "Original RFC Message-ID is unavailable or unsafe; native threading cannot be guaranteed",
    );
  return value;
}
export function buildReplyMime(
  source: Message,
  draft: ReplyDraft,
  kind: ReplyKind,
) {
  validateDraft(draft);
  const files = checkedAttachments(draft.attachments);
  const boundary = "syrka-" + randomBytes(12).toString("hex"),
    alternative = "alt-" + randomBytes(12).toString("hex");
  const html = sanitizeReplyHtml(draft.html || "");
  const headers = [
    `To: ${draft.to
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .join(",\r\n ")}`,
    ...(draft.cc
      ? [
          `Cc: ${draft.cc
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean)
            .join(",\r\n ")}`,
        ]
      : []),
    ...(draft.bcc
      ? [
          `Bcc: ${draft.bcc
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean)
            .join(",\r\n ")}`,
        ]
      : []),
    `Subject: =?UTF-8?B?${Buffer.from(kind === "forward" ? draft.subject : source.subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
  ];
  if (kind !== "forward") {
    const id = messageId(source.internetMessageId);
    const refs = (source.references || "").match(/<[^<>\s]{1,300}>/g) || [];
    headers.push(
      `In-Reply-To: ${id}`,
      `References: ${[...new Set([...refs.slice(-15), id])].join(" ")}`,
    );
  }
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const body = [
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
    `--${alternative}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    folded(draft.text),
  ];
  if (html)
    body.push(
      `--${alternative}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      folded(html),
    );
  body.push(`--${alternative}--`);
  for (const a of files)
    body.push(
      `--${boundary}`,
      `Content-Type: ${a.contentType}; charset=UTF-8`,
      `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(a.name).replace(/'/g, "%27")}`,
      "Content-Transfer-Encoding: base64",
      "",
      a.dataBase64.match(/.{1,76}/g)?.join("\r\n") || "",
    );
  body.push(`--${boundary}--`);
  return Buffer.from(
    headers.join("\r\n") + "\r\n\r\n" + body.join("\r\n"),
  ).toString("base64url");
}
async function call(
  c: Connection,
  url: string,
  body: unknown,
  method = "POST",
) {
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${c.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Provider reply operation failed (${r.status})`);
  return [202, 204].includes(r.status) ? {} : r.json();
}
export async function sendProviderReply(
  c: Connection,
  source: Message,
  input: Partial<ReplyDraft> & { text: string },
  kind: ReplyKind,
) {
  if (c.provider === "zoho")
    throw new Error(
      "Native Zoho replies are awaiting documented threading/API verification",
    );
  const defaults = replyRecipients(source, c.address || "", kind);
  const draft: ReplyDraft = {
    ...defaults,
    bcc: "",
    subject: kind === "forward" ? "Fwd: " + source.subject : source.subject,
    text: input.text,
    html: input.html || "",
    attachments: checkedAttachments(input.attachments),
    ...(input.to !== undefined ? { to: input.to } : {}),
    ...(input.cc !== undefined ? { cc: input.cc } : {}),
    ...(input.bcc !== undefined ? { bcc: input.bcc } : {}),
  };
  validateDraft(draft);
  if (c.provider === "gmail") {
    if (kind !== "forward" && !source.threadId)
      throw new Error("Original Gmail thread ID is unavailable");
    return call(
      c,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        raw: buildReplyMime(source, draft, kind),
        ...(kind !== "forward" ? { threadId: source.threadId } : {}),
      },
    );
  }
  const base = "https://graph.microsoft.com/v1.0/me/messages";
  const native =
    kind === "all"
      ? "createReplyAll"
      : kind === "forward"
        ? "createForward"
        : "createReply";
  const created = await call(
    c,
    `${base}/${encodeURIComponent(source.id)}/${native}`,
    {},
  );
  if (!created.id)
    throw new Error("Provider did not create a native reply draft");
  const id = encodeURIComponent(created.id);
  const recipients = (value: string) =>
    value
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((address) => ({ emailAddress: { address } }));
  await call(
    c,
    `${base}/${id}`,
    {
      body: {
        contentType: draft.html ? "HTML" : "Text",
        content: draft.html ? sanitizeReplyHtml(draft.html) : draft.text,
      },
      toRecipients: recipients(draft.to),
      ccRecipients: recipients(draft.cc),
      bccRecipients: recipients(draft.bcc),
    },
    "PATCH",
  );
  for (const file of draft.attachments)
    await call(c, `${base}/${id}/attachments`, {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: file.name,
      contentType: file.contentType,
      contentBytes: file.dataBase64,
    });
  return call(c, `${base}/${id}/send`, {});
}
