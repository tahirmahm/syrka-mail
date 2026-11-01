import type { Connection, Message } from "../providers";
import { listMail, sendMail, zohoDomain, gmailMessage } from "../providers";
export type MailOperation =
  | "list"
  | "read"
  | "send"
  | "search"
  | "drafts"
  | "archive"
  | "trash"
  | "markRead"
  | "star"
  | "attachments"
  | "threads"
  | "sync"
  | "schedule"
  | "provision";
export interface MailProviderAdapter {
  capabilities: ReadonlySet<MailOperation>;
  list(): Promise<Message[]>;
  send(draft: { to: string; subject: string; text: string }): Promise<unknown>;
  read(id: string): Promise<Message>;
  mutate(
    id: string,
    operation: "archive" | "trash" | "markRead" | "star",
    enabled: boolean,
  ): Promise<void>;
}
async function providerFetch(c: Connection, path: string, init?: RequestInit) {
  const base =
    c.provider === "gmail"
      ? "https://gmail.googleapis.com/gmail/v1/users/me"
      : c.provider === "microsoft"
        ? "https://graph.microsoft.com/v1.0/me"
        : `${zohoDomain(c.api_domain)}/api/accounts/${encodeURIComponent(c.account_id || "")}`;
  const r = await fetch(base + path, {
    ...init,
    headers: {
      Authorization:
        c.provider === "zoho"
          ? `Zoho-oauthtoken ${c.access_token}`
          : `Bearer ${c.access_token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!r.ok)
    throw new Error(
      r.status === 429
        ? "Provider rate limit reached; retry later"
        : r.status === 401
          ? "Provider reconnection required"
          : `Provider operation failed (${r.status})`,
    );
  return r.status === 204 ? {} : r.json();
}
export function createAdapter(c: Connection): MailProviderAdapter {
  return {
    capabilities: new Set<MailOperation>(
      c.provider === "zoho"
        ? ["list", "read", "send"]
        : [
            "list",
            "read",
            "send",
            "archive",
            "trash",
            "markRead",
            "star",
            "attachments",
          ],
    ),
    list: () => listMail(c),
    send: (d) => sendMail(c, d),
    async read(id) {
      if (c.provider === "zoho") {
        const d = await providerFetch(
          c,
          `/messages/${encodeURIComponent(id)}/content`,
        );
        return {
          id,
          subject: "Message",
          from: "",
          preview: "",
          text: String(d.data?.content || "").replace(/<[^>]*>/g, " "),
          date: new Date().toISOString(),
          unread: false,
        };
      }
      if (c.provider === "gmail")
        return gmailMessage(
          await providerFetch(
            c,
            `/messages/${encodeURIComponent(id)}?format=full`,
          ),
        );
      const m = await providerFetch(
        c,
        `/messages/${encodeURIComponent(id)}?$expand=attachments($select=id,name,contentType,size,isInline)`,
        { headers: { Prefer: 'outlook.body-content-type="text"' } },
      );
      return {
        id: m.id,
        threadId: m.conversationId,
        internetMessageId: m.internetMessageId,
        to: (m.toRecipients || []).map((v: any) => v.emailAddress.address),
        cc: (m.ccRecipients || []).map((v: any) => v.emailAddress.address),
        subject: m.subject,
        from: m.from?.emailAddress?.address || "",
        preview: m.bodyPreview,
        text:
          m.body.contentType?.toLowerCase() === "text"
            ? m.body.content
            : m.bodyPreview,
        date: m.receivedDateTime,
        unread: !m.isRead,
        attachments: (m.attachments || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          contentType: a.contentType,
          size: a.size,
        })),
      };
    },
    async mutate(id, op, enabled) {
      if (c.provider === "zoho")
        throw new Error("This Zoho operation is not implemented");
      const path = "/messages/" + encodeURIComponent(id);
      if (c.provider === "microsoft") {
        if (op === "archive" || op === "trash") {
          await providerFetch(c, path + "/move", {
            method: "POST",
            body: JSON.stringify({
              destinationId: op === "archive" ? "archive" : "deleteditems",
            }),
          });
        } else
          await providerFetch(c, path, {
            method: "PATCH",
            body: JSON.stringify(
              op === "markRead"
                ? { isRead: enabled }
                : { flag: { flagStatus: enabled ? "flagged" : "notFlagged" } },
            ),
          });
        return;
      }
      if (op === "trash") {
        await providerFetch(c, path + "/trash", { method: "POST" });
        return;
      }
      const label =
        op === "archive" ? "INBOX" : op === "star" ? "STARRED" : "UNREAD";
      const add = op === "markRead" ? !enabled : enabled;
      await providerFetch(c, path + "/modify", {
        method: "POST",
        body: JSON.stringify(
          op === "archive"
            ? { removeLabelIds: ["INBOX"] }
            : { [add ? "addLabelIds" : "removeLabelIds"]: [label] },
        ),
      });
    },
  };
}
