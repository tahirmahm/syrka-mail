"use client";
import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import {
  Reply,
  Send,
  Paperclip,
  Bold,
  Italic,
  List,
  ChevronDown,
  X,
  Type,
  Check,
} from "lucide-react";
import type {
  ReplyDraft,
  ReplyKind,
  OutgoingAttachment,
} from "@/lib/mail/reply-types";
const allowed = {
  ALLOWED_TAGS: ["p", "div", "br", "strong", "b", "em", "i", "ul", "ol", "li"],
  ALLOWED_ATTR: [],
};
export default function InlineReply({
  identity,
  kind,
  initial,
  onChange,
  onKind,
  onSend,
  onClose,
  simulated = false,
  saved = "Draft saved",
  busy = false,
  attachmentEnabled = true,
}: {
  identity: string;
  kind: ReplyKind;
  initial: ReplyDraft;
  onChange: (draft: ReplyDraft) => void;
  onKind: (kind: ReplyKind) => void;
  onSend: (draft: ReplyDraft) => Promise<void> | void;
  onClose: () => void;
  simulated?: boolean;
  saved?: string;
  busy?: boolean;
  attachmentEnabled?: boolean;
}) {
  const [draft, setDraft] = useState(initial),
    [details, setDetails] = useState(kind === "forward"),
    [formatting, setFormatting] = useState(false),
    [error, setError] = useState("");
  const editor = useRef<HTMLDivElement>(null),
    fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editor.current) {
      editor.current.innerHTML = initial.html
        ? DOMPurify.sanitize(initial.html, allowed)
        : "";
      if (!initial.html) editor.current.innerText = initial.text;
      editor.current.focus({ preventScroll: true });
      editor.current.scrollIntoView({ block: "nearest" });
    }
  }, []);
  function update(values: Partial<ReplyDraft>) {
    const next = { ...draft, ...values };
    setDraft(next);
    onChange(next);
  }
  function input() {
    if (!editor.current) return;
    update({
      text: editor.current.innerText,
      html: DOMPurify.sanitize(editor.current.innerHTML, allowed),
    });
  }
  function format(command: string) {
    editor.current?.focus();
    document.execCommand(command, false);
    input();
  }
  async function attach(files: FileList | null) {
    if (!files) return;
    try {
      const added: OutgoingAttachment[] = [];
      for (const file of Array.from(files)) {
        if (
          !["text/plain", "text/calendar"].includes(file.type) ||
          file.size > 1024 * 1024
        )
          throw new Error(
            "Use a plain-text or iCalendar sample up to 1 MB. Other file types require the configured scanning/upload pipeline.",
          );
        const content = await file.arrayBuffer();
        const bytes = new Uint8Array(content);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        added.push({
          name: file.name,
          contentType: file.type as OutgoingAttachment["contentType"],
          dataBase64: btoa(binary),
        });
      }
      const all = [...draft.attachments, ...added];
      if (
        all.length > 5 ||
        all.reduce((n, a) => n + a.dataBase64.length, 0) > 7 * 1024 * 1024
      )
        throw new Error(
          "Use at most five attachments with a 5 MB total limit.",
        );
      update({ attachments: all });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  async function send() {
    try {
      if (
        !draft.to.trim() ||
        [draft.to, draft.cc, draft.bcc]
          .flatMap((v) =>
            v
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean),
          )
          .some((a) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(a))
      )
        throw new Error("Enter valid recipient email addresses.");
      if (!draft.text.trim() && !draft.attachments.length)
        throw new Error("Write a reply or attach a file before sending.");
      await onSend(draft);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section
      className="inline-reply"
      aria-label="Inline reply editor"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="inline-reply-heading">
        <Reply size={16} />
        <select
          aria-label="Reply action"
          value={kind}
          onChange={(e) => onKind(e.target.value as ReplyKind)}
        >
          <option value="reply">Reply</option>
          <option value="all">Reply all</option>
          <option value="forward">Forward</option>
        </select>
        <button
          className="recipient-summary"
          onClick={() => setDetails(!details)}
          aria-expanded={details}
        >
          {draft.to || "Add recipient"} <ChevronDown size={13} />
        </button>
        <button
          className="icon-button"
          aria-label="Close inline reply and keep draft"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
      {details && (
        <div className="inline-recipient-details">
          <p>
            From <strong>{identity}</strong>
          </p>
          {(["to", "cc", "bcc"] as const).map((k) => (
            <label key={k}>
              {k.toUpperCase()}
              <input
                aria-label={"Reply " + k.toUpperCase()}
                value={draft[k]}
                onChange={(e) => update({ [k]: e.target.value })}
              />
            </label>
          ))}
          <p className="muted">Subject: {draft.subject}</p>
        </div>
      )}
      <div
        ref={editor}
        className="inline-message-editor"
        role="textbox"
        aria-label="Reply message"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={
          kind === "forward" ? "Add a note…" : "Write your reply…"
        }
        onInput={input}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) void attach(e.dataTransfer.files);
          else {
            document.execCommand(
              "insertText",
              false,
              e.dataTransfer.getData("text/plain"),
            );
            input();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            "insertText",
            false,
            e.clipboardData.getData("text/plain"),
          );
          input();
        }}
      />
      {draft.attachments.length > 0 && (
        <div className="reply-attachments">
          {draft.attachments.map((a, i) => (
            <span key={i}>
              <Paperclip size={13} />
              {a.name}
              <button
                aria-label={"Remove " + a.name}
                onClick={() =>
                  update({
                    attachments: draft.attachments.filter(
                      (_, index) => index !== i,
                    ),
                  })
                }
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {formatting && (
        <div className="formatting-bar" aria-label="Reply formatting">
          {[
            [Bold, "bold", "Bold"],
            [Italic, "italic", "Italic"],
            [List, "insertUnorderedList", "Bullet list"],
          ].map(([Icon, command, label]: any) => (
            <button
              className="icon-button"
              key={command}
              aria-label={label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(command)}
            >
              <Icon size={16} />
            </button>
          ))}
          <span>Safe formatting · remote images and links disabled</span>
        </div>
      )}
      <div className="inline-sendbar">
        <button className="primary" disabled={busy} onClick={send}>
          <Send size={15} />
          {busy ? "Sending…" : simulated ? "Send in demo" : "Send reply"}
        </button>
        <button
          className="icon-button"
          aria-label="Attach reply file"
          disabled={!attachmentEnabled}
          title={
            attachmentEnabled
              ? "Attach safe text or calendar file"
              : "Provider attachment support is unavailable"
          }
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInput}
          type="file"
          aria-label="Reply attachment files"
          hidden
          multiple
          accept="text/plain,text/calendar,.txt,.ics"
          onChange={(e) => void attach(e.target.files)}
        />
        <button
          className="icon-button"
          aria-label="Formatting options"
          aria-pressed={formatting}
          onClick={() => setFormatting(!formatting)}
        >
          <Type size={18} />
        </button>
        <span className="inline-draft-status">
          <Check size={12} />
          {saved}
        </span>
      </div>
      <p className="inline-privacy">
        {simulated
          ? "Demo reply — no email leaves this browser."
          : "Sends only from the selected authorized account when you press Send."}
      </p>
    </section>
  );
}
