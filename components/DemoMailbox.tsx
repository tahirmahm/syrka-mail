"use client";
import InlineReply from "./InlineReply";
import DOMPurify from "dompurify";
import MailCalendar from "./workspace/MailCalendar";
import ContextWorkspace from "./workspace/ContextWorkspace";
import {
  stages as applicationStages,
  seedWorkspace,
  restoreWorkspace,
  workspaceForDemo,
  WORKSPACE_KEY,
  type WorkspaceState,
  type Source,
} from "@/lib/workspace/model";
import {
  replyRecipients,
  type ReplyKind,
  type ReplyDraft,
} from "@/lib/mail/reply-types";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Inbox,
  Send,
  FileText,
  Star,
  Archive,
  Trash2,
  Search,
  Plus,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Clock,
  GraduationCap,
  Briefcase,
  CalendarDays,
  ListTodo,
  Menu,
  X,
  Sparkles,
  RotateCcw,
  LogOut,
  Mail,
  Flag,
} from "lucide-react";
import { Brand, SyrkaSymbol } from "./Brand";
import { Modal } from "./Modal";
import {
  DEMO_KEY,
  DEMO_IDENTITY,
  seedDemo,
  restoreDemo,
  visibleThreads,
  updateThread,
  runScheduled,
  type DemoState,
  type DemoThread,
  type DemoAttachment,
} from "@/lib/demo/model";
type Draft = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};
const blank: Draft = { to: "", cc: "", bcc: "", subject: "", body: "" };
const navigation = [
  [Inbox, "Inbox"],
  [Search, "Search"],
  [Star, "Starred"],
  [Clock, "Snoozed"],
  [Flag, "Important"],
  [Send, "Sent"],
  [FileText, "Drafts"],
  [Clock, "Scheduled"],
  [Archive, "All Mail"],
  [Archive, "Archive"],
  [Mail, "Spam"],
  [Trash2, "Trash"],
] as const;
export default function DemoMailbox({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<DemoState>(() => seedDemo()),
    [ready, setReady] = useState(false),
    [dark, setDark] = useState(false),
    [folder, setFolder] = useState("Inbox"),
    [query, setQuery] = useState(""),
    [unread, setUnread] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [compose, setCompose] = useState(false),
    [settings, setSettings] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [draft, setDraft] = useState<Draft>(blank),
    [draftId, setDraftId] = useState(""),
    [replyThreadId, setReplyThreadId] = useState<string | undefined>(),
    [notice, setNotice] = useState(""),
    [attachment, setAttachment] = useState<DemoAttachment | null>(null),
    [scheduleAt, setScheduleAt] = useState(""),
    [suggestion, setSuggestion] = useState(""),
    [category, setCategory] = useState("All categories"),
    [sort, setSort] = useState("newest");
  const [workspace, setWorkspace] = useState<WorkspaceState>(seedWorkspace),
    [inlineKind, setInlineKind] = useState<ReplyKind | null>(null),
    [inlineDraft, setInlineDraft] = useState<ReplyDraft | null>(null);
  const inlineActive = useRef(false);
  inlineActive.current = !!inlineKind;
  const searchRef = useRef<HTMLInputElement>(null);
  const composeClose = useCallback(() => setCompose(false), []);
  const settingsClose = useCallback(() => setSettings(false), []);
  const attachmentClose = useCallback(() => setAttachment(null), []);
  useEffect(() => {
    try {
      const mail = restoreDemo(localStorage.getItem(DEMO_KEY));
      setState(mail);
      setWorkspace(
        workspaceForDemo(
          localStorage.getItem(WORKSPACE_KEY),
          mail.applicationStates,
        ),
      );
      setDark(localStorage.getItem("syrka-theme") === "dark");
    } catch {
      setNotice(
        "Browser storage is unavailable. Demo changes will last for this visit only.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(state));
    } catch {
      setNotice(
        "Demo storage is full or unavailable. Changes remain in this tab.",
      );
    }
  }, [state, ready]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
      } catch {
        setNotice("Workspace demo storage is unavailable.");
      }
  }, [workspace, ready]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("syrka-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark, ready]);
  useEffect(() => {
    const timer = setInterval(() => setState((s) => runScheduled(s)), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        !(e.target as HTMLElement)?.closest('[role="dialog"],.inline-reply')
      ) {
        if (inlineActive.current) {
          setInlineKind(null);
          return;
        }
        setSelectedId(null);
        setMobileNav(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        newDraft();
      }
    }
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, []);
  function patch(id: string, changes: Partial<DemoThread>) {
    setState((s) => updateThread(s, id, changes));
  }
  function navigate(name: string) {
    setInlineKind(null);
    setInlineDraft(null);
    setFolder(name);
    setSelectedId(null);
    setSuggestion("");
    setMobileNav(false);
    setQuery("");
  }
  function newDraft() {
    setReplyThreadId(undefined);
    setDraft({ ...blank });
    setDraftId("demo-" + crypto.randomUUID());
    setScheduleAt("");
    setCompose(true);
  }
  function openInline(t: DemoThread, kind: ReplyKind) {
    const source =
      t.messages.find((m) => m.from !== DEMO_IDENTITY) || t.messages.at(-1)!;
    const recipients = replyRecipients(source, DEMO_IDENTITY, kind);
    const id = "inline-draft-" + t.id;
    const saved = state.threads.find((v) => v.id === id);
    const m = saved?.messages[0];
    const d: ReplyDraft = {
      ...recipients,
      bcc: "",
      subject:
        kind === "forward"
          ? "Fwd: " + t.subject.replace(/^Fwd: /i, "")
          : t.subject,
      text:
        kind === "forward"
          ? "\n\n---------- Forwarded fictional message ----------\n" +
            source.from +
            "\n" +
            source.body
          : "",
      html: "",
      attachments: [],
    };
    if (m) {
      d.to = m.to.join(", ");
      d.cc = m.cc.join(", ");
      d.bcc = m.bcc?.join(", ") || "";
      d.text = m.body;
      d.html = m.html || "";
      d.attachments = m.attachments.map((a) => ({
        name: a.name,
        contentType: a.type as "text/plain" | "text/calendar",
        dataBase64: btoa(unescape(encodeURIComponent(a.content))),
      }));
    }
    setInlineKind(kind);
    setInlineDraft(d);
  }
  function inlineChanged(d: ReplyDraft) {
    if (!selectedId) return;
    setInlineDraft(d);
    const id = "inline-draft-" + selectedId;
    setState((s) => ({
      ...s,
      threads: [
        ...s.threads.filter((t) => t.id !== id),
        {
          id,
          subject: d.subject,
          category:
            s.threads.find((t) => t.id === selectedId)?.category || "Work",
          folder: "Drafts",
          unread: false,
          starred: false,
          replyToThreadId: selectedId,
          messages: [
            {
              id: "message-" + id,
              from: DEMO_IDENTITY,
              to: d.to
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
              cc: d.cc
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
              bcc: d.bcc
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
              date: new Date().toISOString(),
              body: d.text,
              html: d.html,
              attachments: d.attachments.map((a, i) => ({
                id: id + "-" + i,
                name: a.name,
                type: a.contentType,
                content: new TextDecoder().decode(
                  Uint8Array.from(atob(a.dataBase64), (c) => c.charCodeAt(0)),
                ),
              })),
            },
          ],
        },
      ],
    }));
  }
  function inlineSend(d: ReplyDraft) {
    if (!selectedId) return;
    const parent = state.threads.find((t) => t.id === selectedId)!;
    const saved = state.threads.find(
      (t) => t.id === "inline-draft-" + selectedId,
    );
    const message = {
      ...(saved?.messages[0] || {
        id: crypto.randomUUID(),
        from: DEMO_IDENTITY,
        to: d.to.split(","),
        cc: [],
        date: new Date().toISOString(),
        attachments: [],
      }),
      body: d.text,
      html: d.html,
    };
    setState((s) => {
      const cleaned = s.threads.filter(
        (t) => t.id !== "inline-draft-" + selectedId,
      );
      return {
        ...s,
        threads:
          inlineKind === "forward"
            ? [
                {
                  ...parent,
                  id: crypto.randomUUID(),
                  folder: "Sent",
                  subject: d.subject,
                  messages: [message],
                },
                ...cleaned,
              ]
            : cleaned.map((t) =>
                t.id === selectedId
                  ? { ...t, messages: [...t.messages, message] }
                  : t,
              ),
      };
    });
    setInlineKind(null);
    setInlineDraft(null);
    setNotice("Simulated reply sent. No email left this browser.");
  }
  function sourceThread(id: string, reply = false) {
    const t = state.threads.find((t) => t.id === id);
    if (!t) {
      setNotice("The source thread is not available in this demo.");
      return;
    }
    setFolder("Inbox");
    setSelectedId(id);
    setMobileNav(false);
    setInlineKind(null);
    if (reply) openInline(t, "reply");
  }
  function proposeCalendar(source: Source, title: string) {
    if (workspace.events.some((e) => e.source?.threadId === source.threadId)) {
      navigate("Calendar");
      setNotice(
        "This source already has an event. Open it in Calendar to review or edit; no duplicate was created.",
      );
      return;
    }

    const known = workspace.proposals.find(
      (p) =>
        p.event.source?.threadId === source.threadId && p.state === "proposed",
    );
    if (!known)
      setWorkspace((s) => ({
        ...s,
        proposals: [
          ...s.proposals,
          {
            id: "proposal-" + crypto.randomUUID(),
            state: "proposed",
            uncertainty:
              "Confirm the date, time and timezone. No date is inferred from ambiguous relative wording.",
            event: {
              version: "syrka.calendar.event/1",
              id: "event-" + crypto.randomUUID(),
              relatedId:
                workspace.associations.find(
                  (a) => a.threadId === source.threadId,
                )?.courseId ||
                workspace.opportunities.find(
                  (o) => o.threadId === source.threadId,
                )?.id,
              title,
              kind: "deadline",
              start: "",
              end: "",
              allDay: false,
              timezone: "Europe/Prague",
              reminderMinutes: 30,
              source,
            },
          },
        ],
      }));
    navigate("Calendar");
  }
  function open(t: DemoThread) {
    if (t.id.startsWith("inline-draft-") && t.replyToThreadId) {
      sourceThread(t.replyToThreadId, true);
      return;
    }
    setInlineKind(null);
    setInlineDraft(null);
    if (t.folder === "Drafts") {
      const m = t.messages.at(-1)!;
      setDraft({
        to: m.to.map((v) => v.match(/<([^>]+)>/)?.[1] || v).join(", "),
        cc: m.cc.map((v) => v.match(/<([^>]+)>/)?.[1] || v).join(", "),
        bcc: m.bcc?.join(", ") || "",
        subject: t.subject,
        body: m.body,
      });
      setDraftId(t.id);
      setReplyThreadId(t.replyToThreadId);
      setScheduleAt("");
      setCompose(true);
      return;
    }
    setSelectedId(t.id);
    patch(t.id, { unread: false });
    setSuggestion("");
  }
  function draftThread(
    values: Draft,
    id: string,
    folder: "Drafts" | "Sent" | "Scheduled",
    scheduledAt?: string,
  ): DemoThread {
    return {
      id,
      replyToThreadId: replyThreadId,
      subject: values.subject || "(No subject)",
      category: "Work",
      folder,
      unread: false,
      starred: false,
      scheduledAt,
      messages: [
        {
          id: "message-" + id,
          from: DEMO_IDENTITY,
          to: values.to
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean),
          bcc: values.bcc
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean),
          cc: values.cc
            .split(/[,;]/)
            .map((v) => v.trim())
            .filter(Boolean),
          date: new Date().toISOString(),
          body: values.body,
          attachments: [],
        },
      ],
    };
  }
  function persistDraft(values = draft, id = draftId) {
    if (!id) return;
    const next = draftThread(values, id, "Drafts");
    setState((s) => ({
      ...s,
      threads: [next, ...s.threads.filter((t) => t.id !== id)],
    }));
  }
  useEffect(() => {
    if (!compose || !draftId || !Object.values(draft).some(Boolean)) return;
    const timer = setTimeout(() => persistDraft(), 500);
    return () => clearTimeout(timer);
  }, [draft, compose, draftId]);
  function deliver(scheduled = false) {
    const recipients = [draft.to, draft.cc, draft.bcc].flatMap((v) =>
      v
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter(Boolean),
    );
    if (
      !draft.to.trim() ||
      recipients.some((v) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v))
    ) {
      setNotice(
        "Enter valid comma-separated recipient addresses for the simulation.",
      );
      return;
    }
    if (scheduled && (!scheduleAt || Date.parse(scheduleAt) <= Date.now())) {
      setNotice("Choose a future date and time for simulated scheduling.");
      return;
    }
    const next = draftThread(
      draft,
      draftId,
      scheduled ? "Scheduled" : "Sent",
      scheduled ? new Date(scheduleAt).toISOString() : undefined,
    );
    setState((s) => {
      const parent = replyThreadId
        ? s.threads.find((t) => t.id === replyThreadId)
        : undefined;
      if (parent && !scheduled)
        return {
          ...s,
          threads: s.threads
            .filter((t) => t.id !== draftId)
            .map((t) =>
              t.id === parent.id
                ? { ...t, messages: [...t.messages, ...next.messages] }
                : t,
            ),
        };
      return {
        ...s,
        threads: [next, ...s.threads.filter((t) => t.id !== draftId)],
      };
    });
    setCompose(false);
    setDraft(blank);
    setDraftId("");
    setNotice(
      scheduled
        ? "Scheduled in this demo only. It will move to Sent while the demo is open, or next time you return."
        : "Simulated message sent. No email left this browser.",
    );
  }
  const selected = state.threads.find((t) => t.id === selectedId);
  let threads = visibleThreads(state, folder, query, unread).filter(
    (t) => category === "All categories" || t.category === category,
  );
  if (sort === "oldest") threads = threads.slice().reverse();
  const latest = selected?.messages.at(-1);
  const modalOpen = compose || settings || !!attachment;
  function respond(kind: ReplyKind) {
    if (selected) openInline(selected, kind);
  }
  function propose() {
    if (!selected || !latest) return;
    setState((s) =>
      s.commitments.some((c) => c.threadId === selected.id)
        ? s
        : {
            ...s,
            commitments: [
              ...s.commitments,
              {
                id: crypto.randomUUID(),
                threadId: selected.id,
                title: "Review: " + selected.subject,
                destination:
                  selected.category === "Academic"
                    ? "Campus"
                    : selected.category === "Applications"
                      ? "Passport"
                      : "Dashboard",
                state: "proposed",
                due: "",
                excerpt: latest.body.slice(0, 300),
              },
            ],
          },
    );
    setNotice(
      "Demo proposal saved to My Commitments. No Syrka application was changed.",
    );
  }
  function download(a: DemoAttachment) {
    const url = URL.createObjectURL(new Blob([a.content], { type: a.type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="shell demo-shell" data-ready={ready}>
      <aside
        className={"sidebar " + (mobileNav ? "nav-open" : "")}
        inert={modalOpen}
      >
        <a className="brand" href="/?demo=1" aria-label="Syrka Mail demo">
          <Brand />
        </a>
        <div className="workspace">
          <span className="avatar">AM</span>
          <div>
            Alex Morgan<small>Fictional demo account</small>
          </div>
          <button
            className="mobile-nav-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <button className="compose" onClick={newDraft}>
          <Plus size={18} /> Compose <kbd>⌘ N</kbd>
        </button>
        <div className="nav-label">MAILBOX</div>
        <nav aria-label="Demo mailbox folders">
          {navigation.map(([Icon, name]) => (
            <button
              key={name}
              className={folder === name ? "active" : ""}
              title={name}
              onClick={() => navigate(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name === "Inbox" && (
                <b>
                  {
                    state.threads.filter(
                      (t) => t.folder === "Inbox" && t.unread,
                    ).length
                  }
                </b>
              )}
            </button>
          ))}
          <div className="nav-label">FROM MAIL TO MOMENTUM</div>
          {[
            [ListTodo, "My Commitments"],
            [Briefcase, "Applications"],
            [GraduationCap, "Academic"],
            [CalendarDays, "Calendar"],
          ].map(([Icon, name]: any) => (
            <button
              key={name}
              className={folder === name ? "active" : ""}
              title={name}
              onClick={() => navigate(name)}
            >
              <Icon size={17} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <footer>
          <button onClick={() => setSettings(true)}>
            <Settings size={17} /> Demo settings
          </button>
          <button onClick={onExit}>
            <LogOut size={17} /> Exit demo
          </button>
          <div className="demo-local">
            <span className="online" /> Saved only in this browser
          </div>
        </footer>
      </aside>
      <main
        className={
          (selected ? "has-open-thread " : "") +
          (["Calendar", "Academic", "Applications"].includes(folder)
            ? "task-workspace"
            : "")
        }
        inert={modalOpen || mobileNav}
      >
        <header>
          <div className="breadcrumb">
            <button
              className="mobile-nav-toggle icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
            <SyrkaSymbol className="header-symbol" />
            <span>Mail</span>
            <ChevronRight size={13} />
            <strong>{folder}</strong>
          </div>
          <div className="header-right">
            <span className="demo-pill">Demo Mailbox</span>
            <button
              className="icon-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              aria-label="Demo settings"
              onClick={() => setSettings(true)}
            >
              <Settings size={19} />
            </button>
            <span className="avatar header-avatar">AM</span>
          </div>
        </header>
        <div className="demo-banner">
          <span>
            <strong>A real feel. A fictional mailbox.</strong> Explore
            freely—messages, AI suggestions and Syrka actions are simulated.
          </span>
          <button onClick={onExit}>
            Connect your real email <ChevronRight size={14} />
          </button>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR COMMUNICATIONS, CONSIDERED</div>
            <h1>
              {folder}
              <span className="period">.</span>
            </h1>
            <p>
              {folder === "My Commitments"
                ? "Turn the important details into your next steps."
                : "A little less noise. A little more room to think."}
            </p>
          </div>
          <button
            className="outline"
            onClick={() => {
              setState((s) => runScheduled(s));
              setNotice(
                "Demo mailbox refreshed. Your local changes are preserved.",
              );
            }}
          >
            <RotateCcw size={15} /> Refresh
          </button>
        </div>
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="mailbox demo-mailbox">
          {!["Calendar", "Academic", "Applications"].includes(folder) && (
            <div className="toolbar">
              <label className="search">
                <Search size={18} />
                <input
                  ref={searchRef}
                  placeholder="Search conversations, people, or keywords"
                  aria-label="Search demo messages"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>⌘ K</kbd>
              </label>
              <div className="demo-filters">
                <button
                  className={"outline " + (unread ? "filter-active" : "")}
                  onClick={() => setUnread(!unread)}
                  aria-pressed={unread}
                >
                  Unread
                </button>
                <select
                  aria-label="Filter category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "All categories",
                    "Academic",
                    "Applications",
                    "Work",
                    "Administration",
                    "Personal",
                    "Newsletters",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Sort messages"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
          )}
          {folder === "Calendar" ? (
            <MailCalendar
              state={workspace}
              onChange={setWorkspace}
              onSource={sourceThread}
            />
          ) : folder === "Academic" || folder === "Applications" ? (
            <ContextWorkspace
              view={folder}
              state={workspace}
              onChange={setWorkspace}
              threads={state.threads}
              onSource={sourceThread}
              onCalendar={proposeCalendar}
              onNotice={setNotice}
            />
          ) : folder === "My Commitments" ? (
            <div className="demo-actions-view">
              <div className="section-intro">
                <ListTodo size={22} />
                <div>
                  <h2>Small steps. Meaningful progress.</h2>
                  <p>
                    Every proposal keeps its source. Approval here changes this
                    demo only.
                  </p>
                </div>
              </div>
              {state.commitments.map((c) => (
                <article key={c.id} className="action-card">
                  <div className="action-card-heading">
                    <span className="category-chip">{c.destination}</span>
                    <span className={"state-pill " + c.state}>{c.state}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <blockquote>{c.excerpt}</blockquote>
                  {c.due && (
                    <p className="muted">
                      <Clock size={14} /> {new Date(c.due).toLocaleString()}
                    </p>
                  )}
                  <div className="actions">
                    <button
                      className="outline"
                      onClick={() => {
                        setFolder("Inbox");
                        setSelectedId(c.threadId);
                      }}
                    >
                      View source email
                    </button>
                    {c.state === "proposed" && (
                      <>
                        <button
                          className="primary"
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              commitments: s.commitments.map((v) =>
                                v.id === c.id ? { ...v, state: "approved" } : v,
                              ),
                            }))
                          }
                        >
                          Approve proposal
                        </button>
                        <button
                          className="outline"
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              commitments: s.commitments.map((v) =>
                                v.id === c.id
                                  ? { ...v, state: "dismissed" }
                                  : v,
                              ),
                            }))
                          }
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {c.state === "approved" && (
                      <button
                        className="outline"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            commitments: s.commitments.map((v) =>
                              v.id === c.id ? { ...v, state: "completed" } : v,
                            ),
                          }));
                          setNotice(
                            "Completed in this demo only. No external task was created.",
                          );
                        }}
                      >
                        Complete in demo
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={"demo-mail-content " + (selected ? "reading" : "")}>
              <div
                className={
                  "demo-list " + (selected ? "mobile-list-hidden" : "")
                }
              >
                <div className="list-heading">
                  <span>
                    {folder === "Search" ? "SEARCH RESULTS" : "CONVERSATIONS"}
                  </span>
                  <span>{threads.length} threads</span>
                </div>
                {threads.length ? (
                  threads.map((t) => (
                    <div
                      key={t.id}
                      className={
                        "demo-row " +
                        (t.unread ? "unread " : "") +
                        (t.id === selectedId ? "row-selected" : "")
                      }
                    >
                      <button
                        className={
                          "star-button " + (t.starred ? "is-starred" : "")
                        }
                        aria-label={
                          (t.starred ? "Unstar " : "Star ") + t.subject
                        }
                        onClick={() => patch(t.id, { starred: !t.starred })}
                      >
                        <Star
                          size={16}
                          fill={t.starred ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        className="demo-open-thread"
                        onClick={() => open(t)}
                      >
                        <span
                          className={
                            "sender-avatar category-" + t.category.toLowerCase()
                          }
                        >
                          {t.messages[0].from === DEMO_IDENTITY
                            ? "AM"
                            : t.messages[0].from
                                .split(" ")
                                .map((x) => x[0])
                                .slice(0, 2)
                                .join("")}
                        </span>
                        <span className="row-content">
                          <span className="sender-line">
                            <strong>
                              {t.messages[0].from.split("<")[0].trim()}
                            </strong>
                            {t.messages.length > 1 && (
                              <span className="thread-count">
                                {t.messages.length}
                              </span>
                            )}
                            <time>
                              {new Date(
                                t.messages.at(-1)!.date,
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </span>
                          <span className="row-subject">{t.subject}</span>
                          <small>
                            {t.messages.at(-1)!.body.replace(/\n/g, " ")}
                          </small>
                          <span className="row-meta">
                            <span
                              className={
                                "category-chip category-" +
                                t.category.toLowerCase()
                              }
                            >
                              {t.category}
                            </span>
                            {t.messages.some(
                              (m) => m.attachments.length > 0,
                            ) && <Paperclip size={13} />}{" "}
                            {t.folder === "Scheduled" && <Clock size={13} />}
                          </span>
                        </span>
                        {t.unread && <span className="unread-dot" />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    <Inbox size={32} />
                    <h2>A little room to breathe.</h2>
                    <p>
                      {query
                        ? "No demo messages match these filters."
                        : "There are no messages in this view."}
                    </p>
                    <button
                      className="outline"
                      onClick={() => {
                        setQuery("");
                        setUnread(false);
                        setCategory("All categories");
                        navigate("Inbox");
                      }}
                    >
                      Return to inbox
                    </button>
                  </div>
                )}
              </div>
              {selected && (
                <article className="demo-reader">
                  <div className="reader-toolbar">
                    <button
                      className="icon-button"
                      aria-label="Back to message list"
                      onClick={() => setSelectedId(null)}
                    >
                      <ChevronLeft size={19} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Archive thread"
                      onClick={() => {
                        patch(selected.id, { folder: "Archive" });
                        setSelectedId(null);
                        setNotice("Thread archived in the demo.");
                      }}
                    >
                      <Archive size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Move thread to trash"
                      onClick={() => {
                        patch(selected.id, { folder: "Trash" });
                        setSelectedId(null);
                        setNotice("Thread moved to demo Trash.");
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      className="outline"
                      onClick={() => {
                        patch(selected.id, { unread: !selected.unread });
                        setNotice(
                          selected.unread
                            ? "Marked read in demo."
                            : "Marked unread in demo.",
                        );
                      }}
                    >
                      {selected.unread ? "Mark read" : "Mark unread"}
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Snooze thread for one day"
                      onClick={() => {
                        patch(selected.id, {
                          snoozedUntil: new Date(
                            Date.now() + 86400000,
                          ).toISOString(),
                        });
                        setSelectedId(null);
                        setNotice("Snoozed for one day in demo.");
                      }}
                    >
                      <Clock size={18} />
                    </button>
                  </div>
                  <div className="reader-title">
                    <span
                      className={
                        "category-chip category-" +
                        selected.category.toLowerCase()
                      }
                    >
                      {selected.category}
                    </span>
                    <h2>{selected.subject}</h2>
                    {selected.folder === "Scheduled" && (
                      <div className="scheduled-status">
                        Scheduled simulation ·{" "}
                        {new Date(selected.scheduledAt!).toLocaleString()}{" "}
                        <button
                          className="text-button"
                          onClick={() => {
                            patch(selected.id, {
                              folder: "Drafts",
                              scheduledAt: undefined,
                            });
                            setSelectedId(null);
                            navigate("Drafts");
                            setNotice(
                              "Schedule cancelled; message returned to Drafts.",
                            );
                          }}
                        >
                          Cancel schedule
                        </button>
                      </div>
                    )}
                    {selected.category === "Applications" && (
                      <label className="application-status">
                        Application stage{" "}
                        <select
                          aria-label="Application stage"
                          value={
                            workspace.opportunities.find(
                              (o) => o.threadId === selected.id,
                            )?.stage ||
                            {
                              Exploring: "Interested",
                              Review: "Assessment",
                              Closed: "Withdrawn",
                            }[state.applicationStates[selected.id]] ||
                            state.applicationStates[selected.id] ||
                            "Interested"
                          }
                          onChange={(e) => {
                            const stage = e.target
                              .value as (typeof applicationStages)[number];
                            setWorkspace((s) => ({
                              ...s,
                              opportunities: s.opportunities.map((o) =>
                                o.threadId === selected.id
                                  ? { ...o, stage }
                                  : o,
                              ),
                            }));
                            setState((s) => ({
                              ...s,
                              applicationStates: {
                                ...s.applicationStates,
                                [selected.id]: stage,
                              },
                            }));
                          }}
                        >
                          {applicationStages.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  {selected.messages.map((m, index) => (
                    <section className="conversation-message" key={m.id}>
                      <div className="message-sender">
                        <span className="sender-avatar">
                          {m.from === DEMO_IDENTITY ? "AM" : m.from.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{m.from.split("<")[0]}</strong>
                          <small>
                            To {m.to.join(", ")}
                            {m.cc.length > 0 ? " · CC " + m.cc.join(", ") : ""}
                          </small>
                        </div>
                        <time>
                          {new Date(m.date).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <details open={index === selected.messages.length - 1}>
                        <summary>
                          {index === selected.messages.length - 1
                            ? "Message content"
                            : "Earlier message · expand"}
                        </summary>
                        {m.html ? (
                          <div
                            className="safe-formatted-message"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(m.html, {
                                ALLOWED_TAGS: [
                                  "p",
                                  "div",
                                  "br",
                                  "strong",
                                  "b",
                                  "em",
                                  "i",
                                  "ul",
                                  "ol",
                                  "li",
                                ],
                                ALLOWED_ATTR: [],
                              }),
                            }}
                          />
                        ) : (
                          <pre>{m.body}</pre>
                        )}
                      </details>
                      {m.attachments.map((a) => (
                        <button
                          key={a.id}
                          className="attachment-card"
                          onClick={() => setAttachment(a)}
                        >
                          <FileText size={20} />
                          <span>
                            <strong>{a.name}</strong>
                            <small>Safe fictional sample · preview</small>
                          </span>
                          <Paperclip size={15} />
                        </button>
                      ))}
                    </section>
                  ))}
                  <div className="reader-actions">
                    <button
                      className="primary"
                      onClick={() => respond("reply")}
                    >
                      <Reply size={16} /> Reply
                    </button>
                    <button className="outline" onClick={() => respond("all")}>
                      <ReplyAll size={16} /> Reply all
                    </button>
                    <button
                      className="outline"
                      onClick={() => respond("forward")}
                    >
                      <Forward size={16} /> Forward
                    </button>
                    <button className="outline" onClick={propose}>
                      <ListTodo size={16} /> Propose commitment
                    </button>
                    <button
                      className="outline"
                      onClick={() =>
                        setSuggestion(
                          `SIMULATED SUGGESTION — NOT LIVE AI\n\n${selected.subject}\n\nSource: ${selected.messages[0].id}\n${selected.messages[0].body.split("\n\n")[1]}\n\nReview the original wording before deciding what to do. No dates or commitments have been inferred automatically.`,
                        )
                      }
                    >
                      <Sparkles size={16} /> Demo summary
                    </button>
                  </div>
                  {inlineKind && inlineDraft && (
                    <InlineReply
                      key={selected.id + "-" + inlineKind}
                      identity={DEMO_IDENTITY}
                      kind={inlineKind}
                      initial={inlineDraft}
                      onChange={inlineChanged}
                      onKind={(k) => openInline(selected, k)}
                      onSend={inlineSend}
                      onClose={() => setInlineKind(null)}
                      simulated
                    />
                  )}
                  {suggestion && (
                    <div className="ai-output">
                      <strong>Simulated assistant · no model call</strong>
                      <pre>{suggestion}</pre>
                      <button
                        className="outline"
                        onClick={() => {
                          respond("reply");
                          setDraft((v) => ({
                            ...v,
                            body: "Thank you for the update. I will review the details and follow up with any questions.\n\nAlex",
                          }));
                          setNotice(
                            "A fictional reply suggestion was inserted. Edit it before simulating Send.",
                          );
                        }}
                      >
                        Try a demo reply suggestion
                      </button>
                    </div>
                  )}
                </article>
              )}
            </div>
          )}
          <div className="mailbox-footer">
            <span>
              <span className="online" /> Browser-local demo · never sends real
              email
            </span>
            <span>
              {state.threads.reduce((n, t) => n + t.messages.length, 0)}{" "}
              fictional messages
            </span>
          </div>
        </div>
        <button
          className="mobile-compose primary"
          aria-label="Compose on mobile"
          onClick={newDraft}
        >
          <Plus size={19} /> Compose
        </button>
      </main>
      {compose && (
        <Modal title="New demo message" onClose={composeClose}>
          <div className="demo-compose-notice">
            Simulation only. No message will be sent outside this browser.
          </div>
          <label>
            From
            <input readOnly value={DEMO_IDENTITY} />
          </label>
          {(["to", "cc", "bcc", "subject"] as const).map((key) => (
            <label key={key}>
              {key === "subject" ? "Subject" : key.toUpperCase()}
              <input
                aria-label={key === "subject" ? "Subject" : key.toUpperCase()}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Message
            <textarea
              aria-label="Message"
              rows={8}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </label>
          <p className="muted">
            Draft automatically saved in this browser. Attachments are available
            in seeded demo threads; uploads are not enabled.
          </p>
          <label>
            Schedule simulation (your local time)
            <input
              aria-label="Schedule simulation"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </label>
          <div className="actions">
            <button className="primary" onClick={() => deliver(false)}>
              <Send size={15} /> Simulate send
            </button>
            <button
              className="outline"
              onClick={() => {
                persistDraft();
                setCompose(false);
                setNotice("Demo draft saved. Open it again in Drafts.");
              }}
            >
              Save draft
            </button>
            <button className="outline" onClick={() => deliver(true)}>
              <Clock size={15} /> Schedule
            </button>
            <button
              className="outline"
              onClick={() => {
                setState((s) => ({
                  ...s,
                  threads: s.threads.filter((t) => t.id !== draftId),
                }));
                setCompose(false);
                setDraft(blank);
                setNotice("Demo draft discarded.");
              }}
            >
              Discard
            </button>
          </div>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
        </Modal>
      )}
      {settings && (
        <Modal title="Demo settings" onClose={settingsClose}>
          <p>
            Explore a fictional mailbox with no sign-in or provider access.
            Every message, action and AI suggestion is simulated. All state
            stays in this browser.
          </p>
          <div className="setting-row">
            Appearance
            <button className="outline" onClick={() => setDark(!dark)}>
              {dark ? "Dark" : "Light"}
            </button>
          </div>
          <div className="setting-row">
            Demo data
            <button
              className="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all demo messages, drafts and commitments?",
                  )
                ) {
                  setState(seedDemo());
                  setWorkspace(seedWorkspace());
                  setSelectedId(null);
                  setNotice("Demo reset to its original fictional messages.");
                  setSettings(false);
                }
              }}
            >
              <RotateCcw size={15} /> Reset demo
            </button>
          </div>
          <button className="primary" onClick={onExit}>
            Exit demo and connect real email
          </button>
          <p>
            Gmail, Microsoft and Zoho connection settings are available outside
            the demo. Live Qwen calls retain the verified-free-quota gate.
          </p>
        </Modal>
      )}
      {attachment && (
        <Modal title={attachment.name} onClose={attachmentClose}>
          <p>Fictional sample attachment · plain-text preview</p>
          <pre className="sample-preview">{attachment.content}</pre>
          <button className="primary" onClick={() => download(attachment)}>
            Download safe sample
          </button>
        </Modal>
      )}
    </div>
  );
}
