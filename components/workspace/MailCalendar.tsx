"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  CalendarDays,
  Clock,
  Mail,
} from "lucide-react";
import { Modal } from "../Modal";
import {
  type WorkspaceState,
  type CalendarEvent,
  type EventProposal,
  approveEvent,
  validateEvent,
} from "@/lib/workspace/model";
import {
  activeReminders,
  monthDays,
  weekDays,
  shiftDay,
  eventsForDay,
  zonedValue,
  zonedToIso,
} from "@/lib/workspace/calendar";
type Props = {
  state: WorkspaceState;
  onChange: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSource: (threadId: string) => void;
  mode?: "demo" | "unconfigured";
};
export default function MailCalendar({
  state,
  onChange,
  onSource,
  mode = "demo",
}: Props) {
  const [view, setView] = useState("Month"),
    [zone, setZone] = useState("Europe/Prague"),
    [day, setDay] = useState(() =>
      zonedValue(new Date().toISOString(), "Europe/Prague").slice(0, 10),
    ),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [editing, setEditing] = useState<CalendarEvent | null>(null),
    [proposal, setProposal] = useState<EventProposal | null>(null),
    [error, setError] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const close = useCallback(() => {
    setEditing(null);
    setProposal(null);
    setError("");
  }, []);
  const [reminderTick, setReminderTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setReminderTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = zonedValue(new Date().toISOString(), zone).slice(0, 10);
  const selectedDate = new Date(day + "T12:00:00Z");
  const title = selectedDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const filtered = state.events.filter(
    (e) =>
      (kind === "all" || e.kind === kind) &&
      e.title.toLowerCase().includes(search.toLowerCase()),
  );
  const reminders = useMemo(
    () => activeReminders(filtered),
    [state.events, search, kind, reminderTick],
  );
  const days =
    view === "Month" ? monthDays(day) : view === "Week" ? weekDays(day) : [day];
  const upcoming = state.proposals.filter((p) => p.state === "proposed");
  function edit(event?: CalendarEvent, p?: EventProposal) {
    const value = event || {
      version: "syrka.calendar.event/1" as const,
      id: "event-" + crypto.randomUUID(),
      title: "",
      kind: "meeting" as const,
      start: "",
      end: "",
      allDay: false,
      timezone: zone,
      reminderMinutes: 15,
    };
    setEditing(value);
    setProposal(p || null);
    setStart(
      value.start
        ? value.allDay
          ? value.start
          : zonedValue(value.start, value.timezone)
        : p
          ? ""
          : day + "T09:00",
    );
    setEnd(
      value.end
        ? value.allDay
          ? value.end
          : zonedValue(value.end, value.timezone)
        : p
          ? ""
          : day + "T10:00",
    );
    setError("");
  }
  function save() {
    if (!editing) return;
    try {
      const event = {
        ...editing,
        start: editing.allDay
          ? start.slice(0, 10)
          : zonedToIso(start, editing.timezone),
        end: editing.allDay
          ? end.slice(0, 10)
          : zonedToIso(end, editing.timezone),
      };
      validateEvent(event);
      onChange((s) =>
        proposal
          ? approveEvent(s, proposal.id, event)
          : {
              ...s,
              events: [...s.events.filter((e) => e.id !== event.id), event],
            },
      );
      setDay(
        event.allDay ? event.start : zonedValue(event.start, zone).slice(0, 10),
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function move(amount: number) {
    if (view === "Month") {
      const d = new Date(day + "T12:00:00Z");
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + amount);
      setDay(d.toISOString().slice(0, 10));
    } else setDay(shiftDay(day, amount * (view === "Week" ? 7 : 1)));
  }
  function eventButton(e: CalendarEvent) {
    return (
      <button
        key={e.id}
        className={"calendar-event kind-" + e.kind}
        onClick={() => edit(e)}
      >
        <span className="event-dot" />
        <span>
          {e.allDay
            ? "All day"
            : new Date(e.start).toLocaleTimeString(undefined, {
                timeZone: zone,
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
          <strong>{e.title}</strong>
        </span>
      </button>
    );
  }
  return (
    <section className="calendar-workspace" aria-label="Mail calendar">
      <div className="workspace-context">
        <CalendarDays size={18} />
        <span>
          {mode === "demo"
            ? "Demo Calendar · local events only. Workspace Calendar will remain the authoritative live service."
            : "Workspace Calendar is not connected. Navigation is available; event writes require the authorized Calendar adapter."}
        </span>
      </div>
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">YOUR TIME, IN CONTEXT</span>
          <h2>{title}</h2>
          <span className="calendar-zone">{zone}</span>
        </div>
        <button
          className="primary"
          disabled={mode !== "demo"}
          title={
            mode !== "demo"
              ? "Workspace Calendar authorization is required"
              : undefined
          }
          onClick={() => edit()}
        >
          <Plus size={16} /> New event
        </button>
      </div>
      <div className="calendar-controls">
        <div className="calendar-navigation">
          <button
            className="icon-button"
            aria-label="Previous calendar period"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={19} />
          </button>
          <button className="outline" onClick={() => setDay(today)}>
            Today
          </button>
          <button
            className="icon-button"
            aria-label="Next calendar period"
            onClick={() => move(1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="view-switch" aria-label="Calendar view">
          {["Month", "Week", "Day", "Agenda"].map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              className={view === v ? "selected" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="calendar-filters">
        <label>
          <Search size={15} />
          <input
            aria-label="Search calendar"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Calendar category"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {["all", "meeting", "deadline", "exam", "interview", "course"].map(
            (v) => (
              <option key={v} value={v}>
                {v === "all" ? "All event types" : v}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="Calendar timezone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {[
            "Europe/Prague",
            "UTC",
            "Europe/London",
            "America/New_York",
            "Asia/Singapore",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      {reminders.length > 0 && (
        <div className="calendar-reminders" role="status">
          {reminders.map((e) => (
            <button key={e.id} onClick={() => edit(e)}>
              <Clock size={15} />
              <span>
                Demo reminder: {e.title} ·{" "}
                {e.allDay
                  ? "All-day event"
                  : new Date(e.start).toLocaleTimeString(undefined, {
                      timeZone: e.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
            </button>
          ))}
          <small>
            Shown while this demo is open. No background email or push is sent.
          </small>
        </div>
      )}
      {view === "Month" ? (
        <div className="month-calendar">
          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <div className="calendar-grid" role="grid" aria-label={title}>
            {days.map((d) => (
              <div
                className={
                  "calendar-cell " +
                  (d.slice(0, 7) !== day.slice(0, 7) ? "other-month " : "") +
                  (d === day ? "chosen-day" : "")
                }
                key={d}
                role="gridcell"
              >
                <button
                  aria-label={"Select " + d}
                  aria-pressed={d === day}
                  className={"calendar-date " + (d === today ? "is-today" : "")}
                  onClick={() => setDay(d)}
                >
                  {Number(d.slice(-2))}
                </button>
                <div className="cell-events">
                  {eventsForDay(filtered, d, zone)
                    .slice(0, 2)
                    .map((e) => eventButton(e))}
                  {eventsForDay(filtered, d, zone).length > 2 && (
                    <button
                      className="more-events"
                      onClick={() => {
                        setDay(d);
                        setView("Day");
                      }}
                    >
                      +{eventsForDay(filtered, d, zone).length - 2} more
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : view === "Week" ? (
        <div className="week-calendar" aria-label="Calendar week">
          {days.map((d) => (
            <section key={d}>
              <button
                className={"week-date " + (d === today ? "is-today" : "")}
                onClick={() => {
                  setDay(d);
                  setView("Day");
                }}
              >
                {new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </button>
              {eventsForDay(filtered, d, zone).map((e) => eventButton(e))}
              <button
                className="calendar-add"
                disabled={mode !== "demo"}
                aria-label={"Add event on " + d}
                onClick={() => {
                  setDay(d);
                  edit({
                    ...{
                      version: "syrka.calendar.event/1",
                      id: crypto.randomUUID(),
                      title: "",
                      kind: "meeting",
                      start: zonedToIso(d + "T09:00", zone),
                      end: zonedToIso(d + "T10:00", zone),
                      allDay: false,
                      timezone: zone,
                      reminderMinutes: 15,
                    },
                  });
                }}
              >
                <Plus size={14} />
              </button>
            </section>
          ))}
        </div>
      ) : view === "Day" ? (
        <div className="day-calendar" aria-label="Calendar day">
          <h3>
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </h3>
          {eventsForDay(filtered, day, zone)
            .filter((e) => e.allDay)
            .map(eventButton)}
          {Array.from({ length: 24 }, (_, hour) => (
            <div className="day-hour" key={hour}>
              <span>{String(hour).padStart(2, "0")}:00</span>
              <div>
                {eventsForDay(filtered, day, zone)
                  .filter(
                    (e) =>
                      !e.allDay &&
                      Number(zonedValue(e.start, zone).slice(11, 13)) === hour,
                  )
                  .map(eventButton)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="calendar-agenda"
          role="region"
          aria-label="Calendar agenda"
        >
          {filtered.length ? (
            filtered
              .slice()
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((e) => (
                <article key={e.id}>
                  <span>
                    {e.allDay
                      ? e.start
                      : new Date(e.start).toLocaleDateString(undefined, {
                          timeZone: zone,
                          day: "numeric",
                          month: "short",
                        })}
                  </span>
                  {eventButton(e)}
                  {e.source && (
                    <button
                      className="icon-button"
                      aria-label={"Source email for " + e.title}
                      onClick={() => onSource(e.source!.threadId)}
                    >
                      <Mail size={17} />
                    </button>
                  )}
                </article>
              ))
          ) : (
            <p className="muted">No calendar events match your search.</p>
          )}
        </div>
      )}
      {view === "Month" && (
        <div className="selected-day-agenda">
          <h3>
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </h3>
          {eventsForDay(filtered, day, zone).length ? (
            eventsForDay(filtered, day, zone).map((e) => (
              <article key={e.id}>
                {eventButton(e)}
                {e.source && (
                  <button
                    className="text-button"
                    onClick={() => onSource(e.source!.threadId)}
                  >
                    Source email
                  </button>
                )}
              </article>
            ))
          ) : (
            <p className="muted">Nothing scheduled. A little room to think.</p>
          )}
        </div>
      )}
      {upcoming.length > 0 && (
        <section
          className="calendar-proposals"
          aria-label="Proposed calendar events"
        >
          <h3>
            Awaiting your review <span>{upcoming.length}</span>
          </h3>
          {upcoming.map((p) => (
            <div className="event-proposal" key={p.id}>
              <span className="category-chip">Proposed · {p.event.kind}</span>
              <strong>{p.event.title}</strong>
              <small>
                {p.uncertainty || "Confirm details before adding this event."}
              </small>
              <div className="actions">
                <button className="outline" onClick={() => edit(p.event, p)}>
                  Review proposal
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    onChange((s) => ({
                      ...s,
                      proposals: s.proposals.map((v) =>
                        v.id === p.id ? { ...v, state: "dismissed" } : v,
                      ),
                    }))
                  }
                >
                  Dismiss proposal
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      {editing && (
        <Modal
          title={proposal ? "Review proposed event" : "Event details"}
          onClose={close}
        >
          <span className="demo-compose-notice">
            Demo event · no external calendar write
          </span>
          {proposal && <p>{proposal.uncertainty}</p>}
          <label>
            Event title
            <input
              aria-label="Event title"
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
          </label>
          <label>
            Event type
            <select
              aria-label="Event type"
              value={editing.kind}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  kind: e.target.value as CalendarEvent["kind"],
                })
              }
            >
              {["meeting", "deadline", "exam", "interview", "course"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editing.allDay}
              onChange={(e) => {
                setEditing({ ...editing, allDay: e.target.checked });
                setStart(
                  e.target.checked
                    ? start.slice(0, 10)
                    : (start.slice(0, 10) || day) + "T09:00",
                );
                setEnd(
                  e.target.checked
                    ? end.slice(0, 10) > start.slice(0, 10)
                      ? end.slice(0, 10)
                      : shiftDay(start.slice(0, 10) || day, 1)
                    : (end.slice(0, 10) || day) + "T10:00",
                );
              }}
            />{" "}
            All-day event
          </label>
          <label>
            Start
            <input
              aria-label="Event start"
              type={editing.allDay ? "date" : "datetime-local"}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End {editing.allDay ? "(exclusive date)" : ""}
            <input
              aria-label="Event end"
              type={editing.allDay ? "date" : "datetime-local"}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label>
            Timezone
            <select
              aria-label="Event timezone"
              value={editing.timezone}
              onChange={(e) =>
                setEditing({ ...editing, timezone: e.target.value })
              }
            >
              {[
                "Europe/Prague",
                "UTC",
                "Europe/London",
                "America/New_York",
                "Asia/Singapore",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Reminder
            <select
              aria-label="Event reminder"
              value={editing.reminderMinutes}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  reminderMinutes: Number(e.target.value),
                })
              }
            >
              {[0, 5, 15, 30, 60, 1440].map((v) => (
                <option key={v} value={v}>
                  {v === 0
                    ? "None"
                    : v === 1440
                      ? "One day before"
                      : v + " minutes before"}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Reminders are saved metadata in this demo. No background push/email
            notification is claimed.
          </p>
          {editing.source && (
            <div className="source-evidence">
              <strong>Source evidence</strong>
              <blockquote>{editing.source.excerpt}</blockquote>
              <button
                className="text-button"
                onClick={() => {
                  const id = editing.source!.threadId;
                  close();
                  onSource(id);
                }}
              >
                Open source email
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="primary" onClick={save}>
              {proposal ? "Approve event" : "Save event"}
            </button>
            {!proposal && state.events.some((e) => e.id === editing.id) && (
              <button
                className="outline"
                onClick={() => {
                  onChange((s) => ({
                    ...s,
                    events: s.events.filter((e) => e.id !== editing.id),
                  }));
                  close();
                }}
              >
                Delete event
              </button>
            )}
            <button className="outline" onClick={close}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
