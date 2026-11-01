"use client";
import { useEffect, useState, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Mail,
  Search,
  Plus,
  Inbox,
  Send,
  FileText,
  Star,
  Archive,
  Trash2,
  Settings,
  Sun,
  Moon,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  Command,
} from "lucide-react";
import { Brand } from "./Brand";
import type { Message } from "@/lib/providers";
export default function LiveMailbox({ onDemo }: { onDemo: () => void }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [configuration, setConfiguration] = useState<any>(null);
  const [connecting, setConnecting] = useState("");
  const [connectionError, setConnectionError] = useState<
    Record<string, string>
  >({});
  const [themeReady, setThemeReady] = useState(false);
  const [dark, setDark] = useState(false),
    [folder, setFolder] = useState("Inbox"),
    [query, setQuery] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [selected, setSelected] = useState<Message | null>(null),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [compose, setCompose] = useState(false),
    [settings, setSettings] = useState(false),
    [token, setToken] = useState(""),
    [email, setEmail] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [draft, setDraft] = useState({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      text: "",
    }),
    [ai, setAi] = useState(""),
    [accounts, setAccounts] = useState<
      { id: string; provider: string; address: string; expires_at?: string }[]
    >([]),
    [account, setAccount] = useState(""),
    [actions, setActions] = useState<any[]>([]),
    [draftId, setDraftId] = useState(""),
    [unreadOnly, setUnreadOnly] = useState(false),
    [nextCursor, setNextCursor] = useState<string | undefined>();
  const sendKey = useRef("");
  const activeToken = useRef(token);
  activeToken.current = token;
  const mailRequest = useRef(0);
  const messageRequest = useRef(0);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      setDark(localStorage.getItem("syrka-theme") === "dark");
    } catch {}
    setThemeReady(true);
  }, []);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok)
          throw new Error("Configuration status is unavailable.");
        const config = await response.json();
        if (!active) return;
        setConfiguration(config);
        const params = new URLSearchParams(location.search);
        const callbackError = params.get("connection_error");
        if (callbackError) {
          setNotice(callbackError.slice(0, 300));
          setSettings(true);
          const p = params.get("connection_provider");
          if (p && ["gmail", "microsoft", "zoho"].includes(p))
            setConnectionError((v) => ({
              ...v,
              [p]: callbackError.slice(0, 300),
            }));
          history.replaceState(null, "", "/");
        } else if (params.has("connected")) {
          setNotice(
            "Provider connected. Your authorized accounts will refresh now.",
          );
          history.replaceState(null, "", "/");
        }
        if (config.publicAuth) {
          const client = createClient(
            config.publicAuth.url,
            config.publicAuth.anonKey,
            { auth: { flowType: "pkce", detectSessionInUrl: false } },
          );
          setSupabase(client);
          const { data, error } = await client.auth.getSession();
          if (!active) return;
          if (error)
            setNotice(
              "Your previous session could not be restored. Please sign in again.",
            );
          setToken(data.session?.access_token || "");
          setSignedIn(!!data.session);
          const subscription = client.auth.onAuthStateChange(
            (_event, session) => {
              if (active) {
                setToken(session?.access_token || "");
                setSignedIn(!!session);
              }
            },
          );
          unsubscribe = () => subscription.data.subscription.unsubscribe();
        }
      } catch (e) {
        if (active) setNotice((e as Error).message);
      }
    }
    void initialize();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("syrka-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark, themeReady]);
  async function api(path: string, body?: unknown, method?: string) {
    const r = await fetch(path, {
      method: method || (body ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(path.startsWith("/api/mail") && body
          ? { "Idempotency-Key": sendKey.current }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (token !== activeToken.current)
      throw new Error("Session changed. Retry after signing in.");
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  }
  async function refresh(cursor?: string) {
    const version = ++mailRequest.current;
    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({
        account,
        folder: folder === "Search" ? "All Mail" : folder,
        query,
        ...(cursor ? { cursor } : {}),
      });
      const d = await api("/api/mail?" + params);
      if (version !== mailRequest.current) return;
      setMessages(d.messages);
      setNextCursor(d.nextCursor);
    } catch (e) {
      setNotice((e as Error).message);
      const p = accounts.find((a) => a.id === account)?.provider;
      if (p) setConnectionError((v) => ({ ...v, [p]: (e as Error).message }));
    } finally {
      setLoading(false);
    }
  }
  async function login() {
    if (!supabase) {
      setNotice(
        configuration?.auth.message ||
          "Checking sign-in configuration. Please try again in a moment.",
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + "/auth/callback" },
    });
    setNotice(
      error
        ? "Sign-in email could not be sent: " + error.message
        : "Sign-in link requested. Check your inbox and spam folder, then open the link in this browser.",
    );
    setLoading(false);
  }
  async function send() {
    setLoading(true);
    try {
      await api("/api/mail" + (account ? "?account=" + account : ""), draft);
      setCompose(false);
      sendKey.current = "";
      setDraftId("");
      setDraft({ to: "", cc: "", bcc: "", subject: "", text: "" });
      setNotice("Message sent.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function assist(action: string) {
    if (!selected) return;
    if (
      !window.confirm(
        "Send this selected message to Alibaba Qwen for this request? AI remains disabled unless Free Quota Only is verified.",
      )
    )
      return;
    setLoading(true);
    try {
      const d = await api("/api/ai", {
        action,
        text: selected.text,
        consent: true,
      });
      setAi(d.text);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function loadAccounts() {
    try {
      const d = await api("/api/connections");
      setAccounts(d.accounts);
      if (!account && d.accounts[0]) setAccount(d.accounts[0].id);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function connect(provider: string) {
    setConnecting(provider);
    setConnectionError((v) => ({ ...v, [provider]: "" }));
    try {
      const d = await api("/api/oauth/start", { provider });
      location.assign(d.url);
    } catch (e) {
      setNotice((e as Error).message);
      setConnectionError((v) => ({ ...v, [provider]: (e as Error).message }));
      setConnecting("");
    }
  }
  async function disconnect(id: string) {
    try {
      const d = await api("/api/connections?id=" + id, undefined, "DELETE");
      setNotice(d.notice);
      setMessages([]);
      setSelected(null);
      setAccount("");
      await loadAccounts();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function saveDraft() {
    try {
      const d = await api("/api/drafts", {
        ...draft,
        ...(draftId ? { id: draftId } : {}),
      });
      setDraftId(d.draft.id);
      setNotice("Draft saved to your private Syrka account.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function loadDraft() {
    try {
      const d = await api("/api/drafts");
      if (!d.drafts.length) {
        setNotice("No saved drafts.");
        return;
      }
      const v = d.drafts[0];
      setDraft({
        to: v.to,
        cc: v.cc || "",
        bcc: v.bcc || "",
        subject: v.subject,
        text: v.text,
      });
      setDraftId(v.id);
      sendKey.current = crypto.randomUUID();
      setCompose(true);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function loadActions() {
    try {
      const d = await api("/api/actions");
      setActions(d.actions);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function transition(id: string, state: string) {
    try {
      const d = await api("/api/actions/" + id, { state }, "PATCH");
      setNotice(d.notice);
      await loadActions();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function download(id: string, name: string) {
    if (!selected) return;
    try {
      const params = new URLSearchParams({
        account,
        message: selected.id,
        attachment: id,
        name,
      });
      const r = await fetch("/api/attachments?" + params, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      const url = URL.createObjectURL(await r.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function mutate(operation: string) {
    if (!selected) return;
    try {
      await api(
        "/api/messages" + (account ? "?account=" + account : ""),
        { id: selected.id, operation, enabled: true },
        "PATCH",
      );
      setSelected(null);
      await refresh();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function propose() {
    if (!selected || !account) return;
    const title = window.prompt("Proposed task title", selected.subject);
    if (!title) return;
    const target = window.prompt(
      "Destination: dashboard, roadmaps, passport, campus, workspace, calendar, sessions",
      "dashboard",
    );
    if (!target) return;
    try {
      await api("/api/actions", {
        version: "syrka.mail.action/1",
        sourceMessageId: selected.id,
        sourceAccountId: account,
        destination: target,
        title,
        description:
          "Manually proposed from selected correspondence. Review its meaning before approval.",
        excerpt: selected.text.slice(0, 1000) || selected.subject,
      });
      setNotice("Action proposed. Review it in My Commitments.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  useEffect(() => {
    if (token) void loadAccounts();
    else {
      mailRequest.current++;
      messageRequest.current++;
      setAccounts([]);
      setAccount("");
      setMessages([]);
      setSelected(null);
      setActions([]);
    }
  }, [token]);
  useEffect(() => {
    mailRequest.current++;
    messageRequest.current++;
    setMessages([]);
    setSelected(null);
    setNextCursor(undefined);
    if (token && account) void refresh();
  }, [account, folder]);
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCompose(false);
        setSettings(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        sendKey.current = crypto.randomUUID();
        setCompose(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search input")?.focus();
      }
    }
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, []);
  useEffect(() => {
    if (!compose && !settings) return;
    const previous = document.activeElement as HTMLElement;
    const root = dialog.current;
    root?.querySelector<HTMLElement>("button,input")?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select,a[href]",
        ),
      );
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [compose, settings]);
  const filtered = messages.filter(
    (m) =>
      (!unreadOnly || m.unread) &&
      (m.subject + " " + m.from + " " + m.preview)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="shell" data-ready={themeReady}>
      <aside className="sidebar" inert={compose || settings}>
        <a className="brand" href="/">
          <Brand />
        </a>
        <div className="workspace">
          <span className="avatar">S</span>
          <div>
            Syrka workspace<small>Your personal space</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <button
          className="compose"
          onClick={() => {
            sendKey.current = crypto.randomUUID();
            setCompose(true);
          }}
        >
          <Plus size={19} /> Compose message <span>⌘ N</span>
        </button>
        <div className="nav-label">MAILBOX</div>
        <nav>
          {[
            [Inbox, "Inbox"],
            [Search, "Search"],
            [FileText, "My Commitments"],
            [FileText, "Applications"],
            [FileText, "Academic"],
            [FileText, "Calendar"],
            [Star, "Starred"],
            [Archive, "Snoozed"],
            [Send, "Sent"],
            [FileText, "Drafts"],
            [FileText, "Scheduled"],
            [Archive, "All Mail"],
            [Trash2, "Spam"],
            [Trash2, "Trash"],
          ].map(([Icon, name]: any) => (
            <button
              key={name}
              className={folder === name ? "active" : ""}
              onClick={() => {
                setFolder(name);
                setSelected(null);
                if (
                  [
                    "My Commitments",
                    "Applications",
                    "Academic",
                    "Calendar",
                  ].includes(name)
                )
                  loadActions();
              }}
            >
              <Icon size={18} />
              {name}
              {name === "Inbox" && messages.length > 0 && (
                <b>{messages.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label labels-title">
          YOUR LABELS <Plus size={14} />
        </div>
        <div className="label">
          <i className="dot purple" />
          Work
        </div>
        <div className="label">
          <i className="dot green" />
          Personal
        </div>
        <div className="label">
          <i className="dot orange" />
          Ideas
        </div>
        <div className="ecosystem">
          <Sparkles size={19} />
          <strong>Better, together.</strong>
          <p>
            Your conversations.
            <br />
            Your Syrka universe.
          </p>
          <button
            onClick={() => {
              setSettings(true);
              setNotice(
                "Syrka ecosystem endpoints and authorization requirements have not been supplied.",
              );
            }}
          >
            Explore your workspace <ArrowUpRight size={14} />
          </button>
        </div>
        <footer>
          <button onClick={() => setSettings(true)}>
            <Settings size={18} /> Settings & connections
          </button>
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}{" "}
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <div className="profile">
            <span className="avatar">Y</span>
            <div>
              Your workspace
              <small>{signedIn ? "Signed in securely" : "Not signed in"}</small>
            </div>
            <span className="online" />
          </div>
        </footer>
      </aside>
      <main inert={compose || settings}>
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} /> <strong>Mail</strong>
          </div>
          <div className="header-right">
            <button className="outline" onClick={onDemo}>
              Demo Mailbox
            </button>
            {accounts.length > 0 && (
              <select
                aria-label="Active email account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.address}
                  </option>
                ))}
              </select>
            )}
            <span className="private">
              <span className="online" /> A little more focused.
            </span>
            <button
              className="icon-button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setSettings(true)}
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR DAILY SPACE</div>
            <h1>
              {folder}
              <span className="period">.</span>
            </h1>
            <p>A clear mind starts with a clear inbox.</p>
          </div>
          <button
            className="outline"
            onClick={() => refresh()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="mailbox">
          <div className="toolbar">
            <div className="tabs">
              <button
                className={"tab " + (!unreadOnly ? "selected" : "")}
                onClick={() => setUnreadOnly(false)}
              >
                All mail <span>{messages.length}</span>
              </button>
              <button
                className={"tab " + (unreadOnly ? "selected" : "")}
                onClick={() => setUnreadOnly(!unreadOnly)}
              >
                Unread <span>{messages.filter((m) => m.unread).length}</span>
              </button>
            </div>
            <label className="search">
              <Search size={16} />
              <input
                placeholder="Search your conversations"
                aria-label="Search messages"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void refresh();
                }}
              />
              <kbd>⌘ K</kbd>
            </label>
          </div>
          <div className="list-heading">
            <span>YOUR CONVERSATIONS</span>
            <span>{filtered.length} messages</span>
          </div>
          {["My Commitments", "Applications", "Academic", "Calendar"].includes(
            folder,
          ) ? (
            <div className="commitment-feed">
              <h2>Your approved next steps</h2>
              <p className="muted">
                Source-linked proposals stay private here. Destination
                connections are not live.
              </p>
              {actions.length ? (
                actions.map((a) => (
                  <div className="action-card" key={a.id}>
                    <strong>{a.payload.title}</strong>
                    <p>{a.payload.description}</p>
                    <blockquote>{a.payload.excerpt}</blockquote>
                    <small>
                      {a.payload.destination} · {a.state} · Source:{" "}
                      {a.payload.sourceMessageId}
                    </small>
                    {a.state === "proposed" && (
                      <div className="actions">
                        <button
                          className="outline"
                          onClick={() => transition(a.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="outline"
                          onClick={() => transition(a.id, "dismissed")}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty">
                  <FileText size={28} />
                  <h2>No proposed commitments yet</h2>
                  <p>
                    Open a real message and propose a source-linked action.
                    <br />
                    Nothing is created in other Syrka apps without approval and
                    a connected contract.
                  </p>
                </div>
              )}
            </div>
          ) : folder === "Drafts" ? (
            <div className="empty">
              <h2>Saved drafts</h2>
              <p>Drafts are private to your Syrka account.</p>
              <button className="outline" onClick={loadDraft}>
                Restore most recent draft
              </button>
            </div>
          ) : ![
              "Inbox",
              "Search",
              "All Mail",
              "Starred",
              "Sent",
              "Archive",
              "Trash",
              "Spam",
            ].includes(folder) ? (
            <div className="empty">
              <Archive size={30} />
              <h2>{folder} is not connected yet</h2>
              <p>
                Folder synchronization is still being implemented.
                <br />
                Your connected inbox is available in Inbox.
              </p>
              <button className="outline" onClick={() => setFolder("Inbox")}>
                Back to inbox
              </button>
            </div>
          ) : selected ? (
            <article className="message">
              <button
                className="text-button"
                onClick={() => {
                  setSelected(null);
                  setAi("");
                }}
              >
                ← Back to inbox
              </button>
              <h2>{selected.subject}</h2>
              <p className="muted">
                {selected.from} · {new Date(selected.date).toLocaleString()}
              </p>
              <pre>{selected.text}</pre>
              {selected.attachments?.map((a) => (
                <button
                  className="outline"
                  key={a.id}
                  onClick={() => download(a.id, a.name)}
                >
                  {a.name} · {Math.ceil(a.size / 1024)} KB
                </button>
              ))}
              <div className="actions">
                {accounts.find((a) => a.id === account)?.provider !==
                  "zoho" && (
                  <>
                    <button
                      className="outline"
                      onClick={() => mutate("archive")}
                    >
                      Archive
                    </button>
                    <button className="outline" onClick={() => mutate("trash")}>
                      Trash
                    </button>
                    <button
                      className="outline"
                      onClick={() => mutate("markRead")}
                    >
                      Mark read
                    </button>
                    <button className="outline" onClick={() => mutate("star")}>
                      Star
                    </button>
                  </>
                )}
                <button
                  className="outline"
                  onClick={() => {
                    setDraft({
                      cc: "",
                      bcc: "",
                      to:
                        selected.from.match(/<([^>]+)>/)?.[1] || selected.from,
                      subject: `Re: ${selected.subject}`,
                      text: "",
                    });
                    sendKey.current = crypto.randomUUID();
                    setCompose(true);
                  }}
                >
                  Reply
                </button>
                <button
                  className="outline"
                  disabled={loading || !configuration?.ai.enabled}
                  title={configuration?.ai.message}
                  onClick={() => assist("summarize")}
                >
                  <Sparkles size={15} /> Summarize with Qwen
                </button>
                <button
                  className="outline"
                  disabled={loading || !configuration?.ai.enabled}
                  title={configuration?.ai.message}
                  onClick={() => assist("reply")}
                >
                  Suggest reply
                </button>
                <button className="outline" onClick={propose}>
                  Propose action
                </button>
              </div>
              {!configuration?.ai.enabled && (
                <p className="muted ai-disabled-note">
                  Live Qwen is unavailable until the model, credentials and
                  current Free Quota Only entitlement are verified.
                </p>
              )}
              {ai && (
                <div className="ai-output">
                  <strong>Qwen suggestion · review before use</strong>
                  <pre>{ai}</pre>
                </div>
              )}
            </article>
          ) : filtered.length ? (
            filtered.map((m) => (
              <button
                key={m.id}
                className={"message-row " + (m.unread ? "unread" : "")}
                onClick={() => {
                  const version = ++messageRequest.current;
                  setSelected(m);
                  setAi("");
                  {
                    api(
                      "/api/messages?account=" +
                        account +
                        "&id=" +
                        encodeURIComponent(m.id),
                    )
                      .then((d) => {
                        if (version === messageRequest.current)
                          setSelected(
                            accounts.find((a) => a.id === account)?.provider ===
                              "zoho"
                              ? { ...m, text: d.message.text }
                              : { ...m, ...d.message },
                          );
                      })
                      .catch((e) => setNotice(e.message));
                  }
                }}
              >
                <span className="sender-avatar">
                  {m.from[0]?.toUpperCase()}
                </span>
                <span className="row-content">
                  <strong>{m.from}</strong>
                  <span>{m.subject}</span>
                  <small>{m.preview}</small>
                </span>
                <time>{new Date(m.date).toLocaleDateString()}</time>
              </button>
            ))
          ) : (
            <div className="empty">
              <div className="empty-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="envelope">
                  <Mail size={42} strokeWidth={1.3} />
                  <span className="tiny-spark">✦</span>
                </div>
                <span className="floating-dot" />
              </div>
              <div className="empty-tag">SPACE FOR WHAT MATTERS</div>
              <h2>Your next conversation starts here.</h2>
              <p>
                Bring your inbox into a calmer space.
                <br />
                Connect your email to get started with Syrka Mail.
              </p>
              <button className="primary" onClick={() => setSettings(true)}>
                <Plus size={16} /> Connect an email account
              </button>
              <button className="outline demo-entry" onClick={onDemo}>
                Explore the interactive Demo Mailbox
              </button>
              <div className="provider-names">
                <span>Google</span>
                <span>Microsoft</span>
                <span>Zoho</span>
              </div>
            </div>
          )}
          {nextCursor && (
            <button
              className="outline next-page"
              disabled={loading}
              onClick={() => refresh(nextCursor)}
            >
              Next page <ChevronRight size={14} />
            </button>
          )}
          <div className="mailbox-footer">
            <span>
              <span className="online" />{" "}
              {signedIn
                ? "Authenticated workspace"
                : "Connect an account to sync your mail"}
            </span>
            <span>
              Made for a little more clarity <Sparkles size={12} />
            </span>
          </div>
        </div>
        <button
          className="mobile-compose primary"
          aria-label="Compose on mobile"
          onClick={() => {
            sendKey.current = crypto.randomUUID();
            setCompose(true);
          }}
        >
          <Plus size={20} /> Compose
        </button>
        <div className="bottom-note">
          <Command size={13} /> One inbox. More room to think.
        </div>
      </main>
      {(settings || compose) && (
        <div className="overlay">
          <section
            ref={dialog}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={compose ? "Compose message" : "Account settings"}
          >
            <button
              className="close icon-button"
              aria-label="Close dialog"
              onClick={() => {
                setCompose(false);
                setSettings(false);
              }}
            >
              <X size={20} />
            </button>
            {compose ? (
              <>
                <div className="eyebrow">A NEW CONVERSATION</div>
                <h2>Compose message</h2>
                <label>
                  To
                  <input
                    type="email"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  />
                </label>
                <label>
                  CC
                  <input
                    value={draft.cc}
                    onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
                  />
                </label>
                <label>
                  BCC
                  <input
                    value={draft.bcc}
                    onChange={(e) =>
                      setDraft({ ...draft, bcc: e.target.value })
                    }
                  />
                </label>
                <label>
                  Subject
                  <input
                    value={draft.subject}
                    onChange={(e) =>
                      setDraft({ ...draft, subject: e.target.value })
                    }
                  />
                </label>
                <label>
                  Message
                  <textarea
                    rows={9}
                    value={draft.text}
                    onChange={(e) =>
                      setDraft({ ...draft, text: e.target.value })
                    }
                  />
                </label>
                <button
                  className="outline"
                  disabled={!signedIn || loading}
                  onClick={saveDraft}
                >
                  Save draft
                </button>{" "}
                <button
                  className="primary"
                  disabled={loading || !signedIn}
                  onClick={send}
                >
                  <Send size={16} /> Send message
                </button>
                <small>
                  Requires a connected provider. Sending occurs only when you
                  press Send.
                </small>
              </>
            ) : (
              <>
                <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                <h2>Accounts & connections</h2>
                <div className="configuration-note" role="status">
                  {configuration?.auth.message ||
                    "Checking authentication configuration…"}
                </div>
                <p>Sign in to your Syrka workspace with a secure email link.</p>
                <label>
                  Email address
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  className="primary"
                  onClick={login}
                  disabled={
                    !email || loading || !configuration?.auth.configured
                  }
                >
                  Send sign-in link <ArrowUpRight size={16} />
                </button>
                {signedIn && (
                  <button
                    className="outline"
                    onClick={async () => {
                      await supabase?.auth.signOut();
                      setMessages([]);
                      setSelected(null);
                    }}
                  >
                    Sign out
                  </button>
                )}
                {notice && (
                  <div className="notice" role="status">
                    {notice}
                  </div>
                )}
                <div className="connection-list">
                  {[
                    ["Gmail", "gmail"],
                    ["Microsoft 365", "microsoft"],
                    ["Zoho Mail", "zoho"],
                  ].map(([name, p]) => (
                    <div key={p}>
                      <Mail size={19} />
                      <strong>{name}</strong>
                      <span className="provider-status">
                        {connectionError[p]
                          ? /reconnect|revoked|401|403/i.test(
                              connectionError[p],
                            )
                            ? "Reconnect required"
                            : "Error"
                          : accounts.some((a) => a.provider === p)
                            ? "Connected"
                            : connecting === p
                              ? "Connecting…"
                              : configuration?.providers?.[p]?.status ===
                                  "ready"
                                ? "Ready to connect"
                                : "Not configured"}
                      </span>
                      <button
                        className="outline"
                        disabled={
                          !signedIn ||
                          configuration?.providers?.[p]?.status !== "ready" ||
                          !!connecting
                        }
                        onClick={() => connect(p)}
                      >
                        {connecting === p ? "Connecting…" : "Connect"}
                      </button>
                      <small className="provider-blocker">
                        {connectionError[p] ||
                          (!signedIn ? "Sign in to Syrka first. " : "") +
                            (configuration?.providers?.[p]?.message ||
                              "Checking provider configuration…")}
                      </small>
                    </div>
                  ))}
                  {accounts.map((a) => (
                    <div key={a.id}>
                      <strong>{a.address}</strong>
                      <span className="provider-status">
                        {connectionError[a.provider]
                          ? "Reconnect required"
                          : "Connected"}
                        {a.expires_at && Date.parse(a.expires_at) < Date.now()
                          ? " · token refresh required"
                          : ""}
                      </span>
                      {connectionError[a.provider] && (
                        <button
                          className="outline"
                          disabled={
                            configuration?.providers?.[a.provider]?.status !==
                            "ready"
                          }
                          onClick={() => connect(a.provider)}
                        >
                          Reconnect
                        </button>
                      )}
                      <button
                        className="outline"
                        onClick={() => disconnect(a.id)}
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  Provider OAuth registration and secure token provisioning are
                  required. See SETUP.md for the current integration status.
                </p>
                <div className="setting-row">
                  Appearance
                  <button className="outline" onClick={() => setDark(!dark)}>
                    {dark ? "Dark" : "Light"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
