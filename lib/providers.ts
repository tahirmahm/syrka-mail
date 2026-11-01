export type Provider = "gmail" | "microsoft" | "zoho";
export interface Attachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
}
export interface Message {
  id: string;
  subject: string;
  from: string;
  preview: string;
  text: string;
  date: string;
  unread: boolean;
  attachments?: Attachment[];
  threadId?: string;
  internetMessageId?: string;
  references?: string;
  to?: string[];
  cc?: string[];
}
export interface Connection {
  id?: string;
  provider: Provider;
  access_token: string;
  api_domain?: string;
  account_id?: string;
  address?: string;
}
async function request(url: string, token: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`Mail provider returned ${response.status}`);
  if (response.status === 202 || response.status === 204) return {};
  const data = await response.json();
  if (data.status?.code && Number(data.status.code) >= 400)
    throw new Error("Provider rejected the operation");
  return data;
}
export interface MailQuery {
  folder?: string;
  query?: string;
  cursor?: string;
}
export interface MailPage {
  messages: Message[];
  nextCursor?: string;
}
export async function listMailPage(
  c: Connection,
  options: MailQuery = {},
): Promise<MailPage> {
  const folder = options.folder || "Inbox";
  const search = (options.query || "").slice(0, 500);
  if (c.provider === "microsoft") {
    const folders: Record<string, string> = {
      Inbox: "inbox",
      Sent: "sentitems",
      Archive: "archive",
      Trash: "deleteditems",
      Spam: "junkemail",
    };
    const root = "https://graph.microsoft.com/v1.0/me";
    const endpoint = folders[folder]
      ? `${root}/mailFolders/${folders[folder]}/messages`
      : `${root}/messages`;
    const url = new URL(endpoint);
    url.searchParams.set("$top", "30");
    url.searchParams.set(
      "$select",
      "id,subject,from,bodyPreview,body,receivedDateTime,isRead",
    );
    if (search)
      url.searchParams.set("$search", `"${search.replace(/["\\]/g, "")}"`);
    else url.searchParams.set("$orderby", "receivedDateTime desc");
    if (folder === "Starred")
      url.searchParams.set("$filter", "flag/flagStatus eq 'flagged'");
    if (options.cursor) {
      if (!/^\d+$/.test(options.cursor)) throw new Error("Invalid page cursor");
      url.searchParams.set("$skip", options.cursor);
    }
    const d = await request(url.toString(), c.access_token, {
      headers: { Prefer: 'outlook.body-content-type="text"' },
    });
    const next = d["@odata.nextLink"]
      ? new URL(d["@odata.nextLink"]).searchParams.get("$skip")
      : undefined;
    return {
      nextCursor: next || undefined,
      messages: d.value.map((m: any) => ({
        id: m.id,
        subject: m.subject,
        from: m.from?.emailAddress?.address || "",
        preview: m.bodyPreview,
        text:
          m.body?.contentType?.toLowerCase() === "text"
            ? m.body.content
            : m.bodyPreview,
        date: m.receivedDateTime,
        unread: !m.isRead,
      })),
    };
  }
  if (c.provider === "gmail") {
    const folders: Record<string, string> = {
      Inbox: "in:inbox",
      Sent: "in:sent",
      Starred: "is:starred",
      Trash: "in:trash",
      Spam: "in:spam",
      Archive: "-in:inbox -in:trash -in:spam",
    };
    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages",
    );
    url.searchParams.set("maxResults", "30");
    url.searchParams.set("q", `${folders[folder] || ""} ${search}`.trim());
    if (options.cursor) url.searchParams.set("pageToken", options.cursor);
    const d = await request(url.toString(), c.access_token);
    const rows = d.messages || [];
    const messages: Message[] = [];
    for (let offset = 0; offset < rows.length; offset += 5) {
      messages.push(
        ...(await Promise.all(
          rows.slice(offset, offset + 5).map(async (m: any) => {
            const v = await request(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=full`,
              c.access_token,
            );
            return gmailMessage(v);
          }),
        )),
      );
    }
    return { messages, nextCursor: d.nextPageToken };
  }
  if (search || folder !== "Inbox")
    throw new Error(
      "Zoho native search and folder filtering are not implemented yet",
    );
  const domain = zohoDomain(c.api_domain);
  if (!c.account_id) throw new Error("Zoho account ID is required");
  const start = options.cursor ? Number(options.cursor) : 0;
  if (!Number.isSafeInteger(start) || start < 0)
    throw new Error("Invalid page cursor");
  const d = await request(
    `${domain}/api/accounts/${encodeURIComponent(c.account_id)}/messages/view?limit=30&start=${start}`,
    c.access_token,
    { headers: { Authorization: `Zoho-oauthtoken ${c.access_token}` } },
  );
  const messages = (d.data || []).map((m: any) => ({
    id: m.messageId,
    subject: m.subject,
    from: m.fromAddress,
    preview: m.summary || "",
    text: m.summary || "",
    date: new Date(Number(m.receivedTime)).toISOString(),
    unread: m.status === "0",
  }));
  return {
    messages,
    nextCursor: messages.length === 30 ? String(start + 30) : undefined,
  };
}
export function gmailMessage(v: any): Message {
  const h = (n: string) =>
    v.payload.headers.find((x: any) => x.name.toLowerCase() === n)?.value || "";
  function text(part: any): string {
    if (part.mimeType === "text/plain" && part.body?.data)
      return Buffer.from(part.body.data, "base64url").toString();
    return (part.parts || []).map(text).filter(Boolean).join("\n");
  }
  const attachments: Attachment[] = [];
  function collect(p: any) {
    if (p.filename && p.body?.attachmentId)
      attachments.push({
        id: p.body.attachmentId,
        name: p.filename,
        size: p.body.size || 0,
        contentType: p.mimeType || "application/octet-stream",
      });
    for (const child of p.parts || []) collect(child);
  }
  collect(v.payload);
  return {
    threadId: v.threadId,
    internetMessageId: h("message-id"),
    references: h("references"),
    to: h("to").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [],
    cc: h("cc").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [],
    attachments,
    id: v.id,
    subject: h("subject"),
    from: h("from"),
    preview: v.snippet,
    text: text(v.payload) || v.snippet,
    date: new Date(Number(v.internalDate)).toISOString(),
    unread: !!v.labelIds?.includes("UNREAD"),
  };
}
export async function listMail(c: Connection): Promise<Message[]> {
  return (await listMailPage(c)).messages;
}
export function zohoDomain(value?: string) {
  const allowed = [
    "https://mail.zoho.com",
    "https://mail.zoho.eu",
    "https://mail.zoho.in",
    "https://mail.zoho.com.au",
  ];
  const domain = value || allowed[0];
  if (!allowed.includes(domain)) throw new Error("Unsupported Zoho region");
  return domain;
}
export function recipients(value: string) {
  return value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}
export interface Draft {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
}
export function validateDraft(d: any) {
  if (
    !d ||
    typeof d.to !== "string" ||
    typeof d.subject !== "string" ||
    typeof d.text !== "string" ||
    d.subject.length > 998 ||
    Buffer.byteLength(d.subject, "utf8") > 500 ||
    d.text.length > 100000 ||
    /[\r\n]/.test(d.subject)
  )
    throw new Error(
      "Valid recipients, a single-line subject and message are required",
    );
  const all = [d.to, d.cc || "", d.bcc || ""];
  if (
    all.some((x) => typeof x !== "string") ||
    !recipients(d.to).length ||
    all.some((x) => /[\r\n]/.test(x)) ||
    all.flatMap(recipients).length > 50 ||
    all
      .flatMap(recipients)
      .some(
        (x) => x.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x),
      )
  )
    throw new Error("Use up to 50 valid comma-separated recipient addresses");
}
export async function sendMail(c: Connection, d: Draft) {
  validateDraft(d);
  if (c.provider === "microsoft")
    return request(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      c.access_token,
      {
        method: "POST",
        body: JSON.stringify({
          message: {
            subject: d.subject,
            body: { contentType: "Text", content: d.text },
            toRecipients: recipients(d.to).map((address) => ({
              emailAddress: { address },
            })),
            ccRecipients: recipients(d.cc || "").map((address) => ({
              emailAddress: { address },
            })),
            bccRecipients: recipients(d.bcc || "").map((address) => ({
              emailAddress: { address },
            })),
          },
          saveToSentItems: true,
        }),
      },
    );
  if (c.provider === "gmail") {
    const raw = Buffer.from(
      `To: ${recipients(d.to).join(",\r\n ")}\r\n${d.cc ? "Cc: " + recipients(d.cc).join(",\r\n ") + "\r\n" : ""}${d.bcc ? "Bcc: " + recipients(d.bcc).join(",\r\n ") + "\r\n" : ""}Subject: =?UTF-8?B?${Buffer.from(d.subject).toString("base64")}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${(
        Buffer.from(d.text)
          .toString("base64")
          .match(/.{1,76}/g) || []
      ).join("\r\n")}`,
    ).toString("base64url");
    return request(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      c.access_token,
      { method: "POST", body: JSON.stringify({ raw }) },
    );
  }
  if (!c.address || !c.account_id)
    throw new Error("Zoho sending identity is not configured");
  return request(
    `${zohoDomain(c.api_domain)}/api/accounts/${encodeURIComponent(c.account_id)}/messages`,
    c.access_token,
    {
      method: "POST",
      headers: { Authorization: `Zoho-oauthtoken ${c.access_token}` },
      body: JSON.stringify({
        fromAddress: c.address,
        toAddress: recipients(d.to).join(","),
        ccAddress: recipients(d.cc || "").join(","),
        bccAddress: recipients(d.bcc || "").join(","),
        subject: d.subject,
        content: d.text,
        mailFormat: "plaintext",
      }),
    },
  );
}
