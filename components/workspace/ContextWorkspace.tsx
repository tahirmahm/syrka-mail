"use client";
import { useState, useCallback } from "react";
import {
  GraduationCap,
  Briefcase,
  ChevronRight,
  Mail,
  CalendarDays,
  ListTodo,
  ArrowUpRight,
  BookOpen,
  FileText,
  GitBranch,
  Check,
} from "lucide-react";
import { Modal } from "../Modal";
import {
  stages,
  sortedSteps,
  type WorkspaceState,
  type Course,
  type Goal,
  type NextStep,
  type Stage,
  type Source,
} from "@/lib/workspace/model";
import type { DemoThread } from "@/lib/demo/model";
type Props = {
  view: "Academic" | "Applications";
  state: WorkspaceState;
  onChange: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  threads: DemoThread[];
  onSource: (id: string, reply?: boolean) => void;
  onCalendar: (source: Source, title: string) => void;
  onNotice: (message: string) => void;
};
export default function ContextWorkspace({
  view,
  state,
  onChange,
  threads,
  onSource,
  onCalendar,
  onNotice,
}: Props) {
  const [reading, setReading] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null),
    [goal, setGoal] = useState<Goal | null>(null),
    [documentId, setDocumentId] = useState<string | null>(null),
    [stage, setStage] = useState("All stages"),
    [evidence, setEvidence] = useState<string[] | null>(null);
  const close = useCallback(() => {
    setReading(null);
    setCourse(null);
    setGoal(null);
    setDocumentId(null);
    setEvidence(null);
  }, []);
  const academic = view === "Academic";
  const relevant = threads.filter(
    (t) =>
      t.category === (academic ? "Academic" : "Applications") &&
      !["Trash", "Spam"].includes(t.folder),
  );
  const steps = sortedSteps(
    state.steps.filter((s) => (academic ? !!s.courseId : !!s.opportunityId)),
  );
  const outlineDeadline = state.steps.find(
    (s) => s.id === "step-outline",
  )?.deadline;
  const doc = state.documents.find((d) => d.id === documentId);
  function changeStep(id: string, next: NextStep["state"]) {
    onChange((s) => ({
      ...s,
      steps: s.steps.map((v) => (v.id === id ? { ...v, state: next } : v)),
    }));
    onNotice(
      "Next-step state updated in this demo only. No external Syrka record was changed.",
    );
  }
  function execute(step: NextStep) {
    if (step.action === "reply") return onSource(step.source.threadId, true);
    if (step.action === "calendar") return onCalendar(step.source, step.title);
    if (step.action === "course") {
      setCourse(state.courses.find((c) => c.id === step.courseId) || null);
      return;
    }
    if (step.action === "goal") {
      setGoal(state.goals.find((g) => g.id === step.goalId) || null);
      return;
    }
    if (step.action === "document") {
      const id = "document-" + step.id;
      onChange((s) =>
        s.documents.some((d) => d.id === id)
          ? s
          : {
              ...s,
              documents: [
                ...s.documents,
                {
                  id,
                  title: step.title,
                  text:
                    "Working notes\n\n" +
                    step.source.excerpt +
                    "\n\nMy draft:\n",
                  source: step.source,
                },
              ],
            },
      );
      setDocumentId(id);
      return;
    }
    changeStep(step.id, "approved");
  }
  const labels = {
    reply: "Draft reply",
    calendar: "Review calendar event",
    course: "Open demo course",
    goal: "Open demo Roadmaps goal",
    document: "Create working document",
    task: "Add demo Dashboard task",
  };
  return (
    <section className="context-workspace" aria-label={view + " workspace"}>
      <div className="workspace-context">
        {academic ? <GraduationCap size={18} /> : <Briefcase size={18} />}
        <span>
          {academic
            ? "Demo Campus context"
            : "Demo Roadmaps / Passport context"}{" "}
          · fictional records, local updates only
        </span>
      </div>
      <div className="context-intro">
        <div>
          <span className="eyebrow">FROM CORRESPONDENCE TO PROGRESSION</span>
          <h2>
            {academic
              ? "Your studies, connected."
              : "Your next opportunity, in focus."}
          </h2>
          <p>
            {academic
              ? "Courses, correspondence and the next small step."
              : "Track the evidence. Understand the stage. Choose your next action."}
          </p>
        </div>
        <span className="context-total">
          {academic
            ? state.courses.length + " demo courses"
            : state.opportunities.length + " opportunities"}
        </span>
      </div>
      {academic ? (
        <div className="course-grid">
          {state.courses.map((c) => (
            <button
              className="course-card"
              key={c.id}
              onClick={() => setCourse(c)}
            >
              <span className="category-chip">{c.code}</span>
              <h3>{c.title}</h3>
              <p>{c.professor}</p>
              <small>
                Fictional Campus membership <ChevronRight size={13} />
              </small>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div
            className="application-pipeline"
            aria-label="Application pipeline"
          >
            <button
              aria-pressed={stage === "All stages"}
              onClick={() => setStage("All stages")}
            >
              All <b>{state.opportunities.length}</b>
            </button>
            {stages.map((s) => (
              <button
                key={s}
                aria-pressed={stage === s}
                onClick={() => setStage(s)}
              >
                {s}
                <b>{state.opportunities.filter((o) => o.stage === s).length}</b>
              </button>
            ))}
          </div>
          <div className="opportunity-grid">
            {state.opportunities
              .filter((o) => stage === "All stages" || o.stage === stage)
              .map((o) => (
                <article className="opportunity-card" key={o.id}>
                  <span className="eyebrow">{o.organization}</span>
                  <h3>{o.title}</h3>
                  <label>
                    Confirmed demo stage
                    <select
                      aria-label={"Stage for " + o.title}
                      value={o.stage}
                      onChange={(e) => {
                        onChange((s) => ({
                          ...s,
                          opportunities: s.opportunities.map((v) =>
                            v.id === o.id
                              ? { ...v, stage: e.target.value as Stage }
                              : v,
                          ),
                        }));
                        onNotice(
                          "Application stage changed by you in the demo. This does not verify employment or a capability.",
                        );
                      }}
                    >
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {o.deadline && (
                    <p className="muted">
                      <CalendarDays size={13} /> Source deadline: {o.deadline}
                    </p>
                  )}
                  {o.documents.length > 0 && (
                    <div className="requested-documents">
                      <strong>Requested documents</strong>
                      <ul>
                        {o.documents.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="actions">
                    <button
                      className="outline"
                      onClick={() => onSource(o.threadId)}
                    >
                      <Mail size={14} /> Source correspondence
                    </button>
                    <button
                      className="outline"
                      onClick={() =>
                        setGoal(
                          state.goals.find((g) => g.id === o.goalId) || null,
                        )
                      }
                    >
                      <GitBranch size={14} /> Career path
                    </button>
                    <button
                      className="outline"
                      onClick={() =>
                        setEvidence(
                          state.goals.find((g) => g.id === o.goalId)
                            ?.evidence || [],
                        )
                      }
                    >
                      Review demo Passport evidence
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
      {academic && (
        <section className="academic-requirements">
          <div className="section-heading">
            <CalendarDays size={20} />
            <div>
              <h3>Upcoming academic requirements</h3>
              <p>
                Fictional course schedule and source-confirmed examinations.
                Relative assignment dates require review.
              </p>
            </div>
          </div>
          {state.events
            .filter((e) => e.relatedId?.startsWith("course-"))
            .map((e) => (
              <article key={e.id}>
                <span className="category-chip">
                  {e.kind === "exam"
                    ? "Examination"
                    : e.kind === "deadline"
                      ? "Assignment deadline"
                      : "Course schedule"}
                </span>
                <strong>{e.title}</strong>
                <small>
                  {new Date(e.start).toLocaleString(undefined, {
                    timeZone: e.timezone,
                  })}{" "}
                  · {e.timezone}
                </small>
                {e.source && (
                  <button
                    className="text-button"
                    onClick={() => onSource(e.source!.threadId)}
                  >
                    Source announcement
                  </button>
                )}
              </article>
            ))}
          <article>
            <span className="category-chip">
              Assignment ·{" "}
              {outlineDeadline ? "date confirmed by you" : "date unconfirmed"}
            </span>
            <strong>Two-page research outline</strong>
            <small>
              The request says “Friday”. Confirm the calendar date instead of
              inferring a deadline.
            </small>
            <button
              className="text-button"
              onClick={() =>
                onCalendar(
                  state.steps.find((s) => s.id === "step-outline")!.source,
                  "Research outline deadline",
                )
              }
            >
              Confirm deadline in Calendar
            </button>
          </article>
        </section>
      )}
      <section className="next-steps">
        <div className="section-heading">
          <ListTodo size={20} />
          <div>
            <h3>Immediate next steps</h3>
            <p>Grounded in source messages and your confirmed demo context.</p>
          </div>
        </div>
        {steps.map((step) => (
          <article key={step.id} className={"next-step-card " + step.state}>
            <div className="action-card-heading">
              <span className="category-chip">
                {step.destination} ·{" "}
                {step.basis === "explicit-request"
                  ? "Explicit request"
                  : "Optional goal support"}
              </span>
              <span className="state-pill">{step.state}</span>
            </div>
            <h4>{step.title}</h4>
            <p>{step.why}</p>
            <div className="source-evidence">
              <blockquote>{step.source.excerpt}</blockquote>
              <button
                className="text-button"
                onClick={() => onSource(step.source.threadId)}
              >
                View source email <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="step-context">
              {step.courseId && (
                <span>
                  {state.courses.find((c) => c.id === step.courseId)?.title}
                </span>
              )}
              {step.opportunityId && (
                <span>
                  {
                    state.opportunities.find((o) => o.id === step.opportunityId)
                      ?.title
                  }
                </span>
              )}
              {step.deadline && (
                <span>
                  <CalendarDays size={13} />{" "}
                  {step.deadline.length === 10
                    ? step.deadline
                    : new Date(step.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            {step.uncertainty && (
              <p className="uncertainty">
                Needs confirmation: {step.uncertainty}
              </p>
            )}
            <div className="actions">
              <button className="primary" onClick={() => execute(step)}>
                {labels[step.action]}
              </button>
              {step.state === "suggested" && (
                <button
                  className="outline"
                  onClick={() => changeStep(step.id, "approved")}
                >
                  Approve step
                </button>
              )}
              {!["completed", "dismissed"].includes(step.state) && (
                <>
                  <button
                    className="outline"
                    onClick={() => changeStep(step.id, "completed")}
                  >
                    <Check size={14} /> Complete
                  </button>
                  <button
                    className="text-button"
                    onClick={() => changeStep(step.id, "dismissed")}
                  >
                    Dismiss step
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </section>
      {academic && (
        <section className="academic-correspondence">
          <div className="section-heading">
            <Mail size={20} />
            <div>
              <h3>Academic correspondence</h3>
              <p>
                Associations require fictional enrolment evidence or your
                explicit confirmation.
              </p>
            </div>
          </div>
          {relevant.map((t) => {
            const link = state.associations.find((a) => a.threadId === t.id);
            return (
              <article className="academic-thread" key={t.id}>
                <button className="text-button" onClick={() => onSource(t.id)}>
                  {t.subject}
                </button>
                <p>{t.messages[0].from.split("<")[0]}</p>
                <label>
                  Related course
                  <select
                    aria-label={"Course for " + t.subject}
                    value={link?.courseId || ""}
                    onChange={(e) => {
                      const courseId = e.target.value;
                      onChange((s) => ({
                        ...s,
                        associations: [
                          ...s.associations.filter((a) => a.threadId !== t.id),
                          ...(courseId
                            ? [
                                {
                                  threadId: t.id,
                                  courseId,
                                  confirmedBy: "user" as const,
                                  evidence:
                                    "Explicitly confirmed by the demo user. No AI course inference.",
                                },
                              ]
                            : []),
                        ],
                      }));
                      onNotice(
                        courseId
                          ? "Course association confirmed by you in the demo."
                          : "Demo course association removed.",
                      );
                    }}
                  >
                    <option value="">Unconfirmed — choose a course</option>
                    {state.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {link?.evidence ||
                    "No association has been confirmed. A vague subject is not enough."}
                </small>
                <div className="actions">
                  <button
                    className="outline"
                    onClick={() => onSource(t.id, true)}
                  >
                    Reply to professor
                  </button>
                  {link && (
                    <button
                      className="outline"
                      onClick={() =>
                        setCourse(
                          state.courses.find((c) => c.id === link.courseId) ||
                            null,
                        )
                      }
                    >
                      Open in demo Campus
                    </button>
                  )}
                  <button
                    className="outline"
                    onClick={() =>
                      onCalendar(
                        {
                          accountId: "demo-alex",
                          threadId: t.id,
                          messageId: t.messages[0].id,
                          excerpt: t.messages[0].body.slice(0, 600),
                        },
                        t.subject,
                      )
                    }
                  >
                    Propose Calendar event
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
      {(course || goal || doc || evidence) && (
        <Modal
          title={
            course
              ? "Demo Campus course"
              : goal
                ? "Demo Roadmaps goal"
                : doc
                  ? "Demo Workspace document"
                  : "Demo Passport evidence"
          }
          onClose={close}
        >
          {course ? (
            <>
              <span className="category-chip">{course.code}</span>
              <h3>{course.title}</h3>
              <p>{course.membership}</p>
              <p>Professor: {course.professor}</p>
              <h4>Authorized fictional readings</h4>
              <ul>
                {course.readings.map((r) => (
                  <li key={r}>
                    <button
                      className="text-button"
                      onClick={() => setReading(r)}
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
              {reading && (
                <div className="reading-sample">
                  <h4>{reading}</h4>
                  <p>
                    Fictional course material for this demo: distinguish the
                    research question from the argument, review the supporting
                    evidence, and prepare one question for discussion.
                  </p>
                </div>
              )}
              <p className="muted">
                These are fictional course records, not a live Campus
                connection. No academic credits or completed achievements are
                inferred.
              </p>
              <button
                className="outline"
                onClick={() => {
                  setGoal(
                    state.goals.find((g) => g.id === course.goalId) || null,
                  );
                  setCourse(null);
                }}
              >
                Open related demo Roadmaps path
              </button>
            </>
          ) : goal ? (
            <>
              <GitBranch size={24} />
              <h3>{goal.title}</h3>
              <p>{goal.path}</p>
              <h4>Preparation focuses</h4>
              <ul>
                {goal.capabilities.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="muted">
                Projection: syrka.capabilities/1. These are fictional
                preparation goals, not verified capabilities or completed
                milestones.
              </p>
              <button
                className="primary"
                onClick={() => {
                  const sourceStep = state.steps.find(
                    (s) => s.goalId === goal.id,
                  );
                  if (sourceStep)
                    onChange((s) =>
                      s.steps.some((v) => v.id === "quest-" + goal.id)
                        ? s
                        : {
                            ...s,
                            steps: [
                              ...s.steps,
                              {
                                ...sourceStep,
                                id: "quest-" + goal.id,
                                title: "Prepare: " + goal.title,
                                why: "Optional preparation quest chosen by you for the linked demo goal.",
                                destination: "Roadmaps",
                                action: "task",
                                basis: "user-goal",
                                state: "suggested",
                              },
                            ],
                          },
                    );
                  onNotice(
                    "Preparation quest saved in demo next steps. No Roadmaps node was completed.",
                  );
                  close();
                }}
              >
                Propose demo preparation quest
              </button>
            </>
          ) : doc ? (
            <>
              <p>Private local working draft · not a live Workspace document</p>
              <label>
                Document title
                <input
                  value={doc.title}
                  onChange={(e) =>
                    onChange((s) => ({
                      ...s,
                      documents: s.documents.map((d) =>
                        d.id === doc.id ? { ...d, title: e.target.value } : d,
                      ),
                    }))
                  }
                />
              </label>
              <label>
                Working text
                <textarea
                  rows={12}
                  value={doc.text}
                  onChange={(e) =>
                    onChange((s) => ({
                      ...s,
                      documents: s.documents.map((d) =>
                        d.id === doc.id ? { ...d, text: e.target.value } : d,
                      ),
                    }))
                  }
                />
              </label>
              <p className="muted">
                Changes save in this browser. Nothing is shared.
              </p>
              <button
                className="outline"
                onClick={() => {
                  close();
                  onSource(doc.source.threadId);
                }}
              >
                Source email
              </button>
            </>
          ) : (
            <>
              <p>
                Fictional, user-owned portfolio examples. None is an
                issuer-verified credential.
              </p>
              <ul>
                {evidence?.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p className="muted">
                Review evidence → Confirm meaning → Propose a record. No
                Passport record is silently created.
              </p>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
