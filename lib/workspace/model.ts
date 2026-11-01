import { z } from "zod";
export const stages = [
  "Interested",
  "Preparing",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Withdrawn",
] as const;
export type Stage = (typeof stages)[number];
export interface Source {
  threadId: string;
  messageId: string;
  accountId: string;
  excerpt: string;
}
export type EventKind =
  "meeting" | "deadline" | "exam" | "interview" | "course";
export interface CalendarEvent {
  version: "syrka.calendar.event/1";
  id: string;
  title: string;
  kind: EventKind;
  start: string;
  end: string;
  allDay: boolean;
  timezone: string;
  reminderMinutes: number;
  source?: Source;
  relatedId?: string;
}
export interface EventProposal {
  id: string;
  state: "proposed" | "approved" | "dismissed";
  event: CalendarEvent;
  uncertainty: string;
}
export interface Course {
  id: string;
  code: string;
  title: string;
  professor: string;
  membership: string;
  goalId: string;
  readings: string[];
}
export interface Association {
  threadId: string;
  courseId: string;
  confirmedBy: "demo-membership" | "user";
  evidence: string;
}
export interface Opportunity {
  id: string;
  threadId: string;
  title: string;
  organization: string;
  stage: Stage;
  goalId: string;
  documents: string[];
  deadline?: string;
}
export interface Goal {
  id: string;
  title: string;
  path: string;
  capabilities: string[];
  evidence: string[];
}
export interface NextStep {
  id: string;
  title: string;
  why: string;
  source: Source;
  courseId?: string;
  opportunityId?: string;
  goalId?: string;
  deadline?: string;
  destination:
    "Campus" | "Roadmaps" | "Dashboard" | "Calendar" | "Workspace" | "Passport";
  state: "suggested" | "approved" | "completed" | "dismissed";
  action: "reply" | "calendar" | "course" | "goal" | "document" | "task";
  basis: "explicit-request" | "user-goal";
  uncertainty?: string;
}
export interface WorkspaceState {
  version: 1;
  events: CalendarEvent[];
  proposals: EventProposal[];
  courses: Course[];
  associations: Association[];
  opportunities: Opportunity[];
  goals: Goal[];
  steps: NextStep[];
  documents: { id: string; title: string; text: string; source: Source }[];
}
export const WORKSPACE_KEY = "syrka.mail.demo.workspace.v1";
const source = (threadId: string, excerpt: string): Source => ({
  threadId,
  messageId: threadId.startsWith("thread-")
    ? "message-" + threadId.slice(7) + "-1"
    : "message-" + threadId,
  accountId: "demo-alex",
  excerpt,
});
export function seedWorkspace(): WorkspaceState {
  const thesis = source(
    "thread-0",
    "Please revise the research question and send a two-page outline by Friday.",
  );
  const interview = source(
    "thread-1",
    "Could you attend an interview on 12 November at 14:00 CET? Please confirm your availability and bring a short example of your research.",
  );
  const exam = source(
    "workflow-exam",
    "The Political Theory examination is on 5 November 2026 at 10:00 CET in room B204.",
  );
  const proposed: CalendarEvent = {
    version: "syrka.calendar.event/1",
    id: "demo-interview-event",
    title: "Interview — Policy Research Internship",
    kind: "interview",
    start: "2026-11-12T13:00:00Z",
    end: "2026-11-12T13:30:00Z",
    allDay: false,
    timezone: "Europe/Prague",
    reminderMinutes: 30,
    source: interview,
    relatedId: "opportunity-policy",
  };
  return {
    version: 1,
    events: [
      {
        version: "syrka.calendar.event/1",
        id: "demo-exam",
        title: "Political Theory examination",
        kind: "exam",
        start: "2026-11-05T09:00:00Z",
        end: "2026-11-05T11:00:00Z",
        allDay: false,
        timezone: "Europe/Prague",
        reminderMinutes: 60,
        source: exam,
        relatedId: "course-political",
      },
      {
        version: "syrka.calendar.event/1",
        id: "demo-reading",
        title: "International Relations seminar",
        kind: "course",
        start: "2026-11-04T13:00:00Z",
        end: "2026-11-04T14:30:00Z",
        allDay: false,
        timezone: "Europe/Prague",
        reminderMinutes: 15,
        relatedId: "course-ir",
      },
      {
        version: "syrka.calendar.event/1",
        id: "demo-documents-deadline",
        title: "Supporting documents deadline",
        kind: "deadline",
        start: "2026-11-20",
        end: "2026-11-21",
        allDay: true,
        timezone: "Europe/Prague",
        reminderMinutes: 1440,
        source: source(
          "workflow-documents",
          "Please submit your writing sample and enrolment certificate by 20 November 2026.",
        ),
        relatedId: "opportunity-documents",
      },
    ],
    proposals: [
      {
        id: "proposal-interview",
        state: "proposed",
        event: proposed,
        uncertainty:
          "The fictional conversation uses the 2026 demo year. Confirm the date, time and Europe/Prague timezone before approval.",
      },
    ],
    courses: [
      {
        id: "course-political",
        code: "POL201",
        title: "Political Theory",
        professor: "Dr. Maya Chen",
        membership: "Fictional Campus enrolment CAMPUS-DEMO-POL201",
        goalId: "goal-research",
        readings: [
          "Research question workshop notes",
          "Argument and evidence: seminar reading",
        ],
      },
      {
        id: "course-ir",
        code: "IR301",
        title: "International Relations",
        professor: "Professor Ada Brooks",
        membership: "Fictional Campus enrolment CAMPUS-DEMO-IR301",
        goalId: "goal-policy",
        readings: [
          "Chapters three and four — course reading list",
          "Discussion questions worksheet",
        ],
      },
    ],
    associations: [
      {
        threadId: "thread-0",
        courseId: "course-political",
        confirmedBy: "demo-membership",
        evidence:
          "Fictional Campus membership and named supervision relationship. Not an AI guess.",
      },
      {
        threadId: "thread-6",
        courseId: "course-ir",
        confirmedBy: "demo-membership",
        evidence: "Fictional IR301 course reading list and professor identity.",
      },
      {
        threadId: "workflow-exam",
        courseId: "course-political",
        confirmedBy: "demo-membership",
        evidence:
          "Explicit POL201 course reference in the fictional announcement.",
      },
      {
        threadId: "workflow-assignment",
        courseId: "course-political",
        confirmedBy: "demo-membership",
        evidence: "Explicit POL201 assignment reference.",
      },
    ],
    opportunities: [
      {
        id: "opportunity-policy",
        threadId: "thread-1",
        title: "Policy Research Internship",
        organization: "Northbridge",
        stage: "Interview",
        goalId: "goal-policy",
        documents: ["Authorized research writing sample"],
      },
      {
        id: "opportunity-analyst",
        threadId: "thread-7",
        title: "Graduate Analyst",
        organization: "Meridian",
        stage: "Applied",
        goalId: "goal-policy",
        documents: [],
      },
      {
        id: "opportunity-research",
        threadId: "thread-13",
        title: "Research Assistant",
        organization: "Campus research lab",
        stage: "Interested",
        goalId: "goal-research",
        documents: ["Short enquiry describing relevant coursework"],
      },
      {
        id: "opportunity-admissions",
        threadId: "workflow-admissions",
        title: "Graduate admissions",
        organization: "Fictional Northbridge University",
        stage: "Preparing",
        goalId: "goal-research",
        documents: ["Transcript", "Statement of purpose"],
        deadline: "2026-11-20",
      },
      {
        id: "opportunity-documents",
        threadId: "workflow-documents",
        title: "Research placement",
        organization: "Fictional Policy Institute",
        stage: "Assessment",
        goalId: "goal-policy",
        documents: ["Writing sample", "Enrolment certificate"],
        deadline: "2026-11-20",
      },
    ],
    goals: [
      {
        id: "goal-policy",
        title: "Policy Research / Geopolitical Analysis",
        path: "Research → Policy analysis → Internship preparation",
        capabilities: [
          "Evidence analysis",
          "Clear professional writing",
          "Interview preparation",
        ],
        evidence: [
          "Fictional policy briefing project — self-reported",
          "Fictional research memo — portfolio example",
        ],
      },
      {
        id: "goal-research",
        title: "Academic research pathway",
        path: "Research methods → Thesis proposal → Graduate study",
        capabilities: [
          "Research question design",
          "Literature review",
          "Academic argument",
        ],
        evidence: ["Fictional seminar essay — self-reported"],
      },
    ],
    steps: [
      {
        id: "step-feedback",
        title: "Review the professor’s comments",
        why: "The supervisor has requested a revised research question and outline.",
        source: thesis,
        courseId: "course-political",
        goalId: "goal-research",
        destination: "Campus",
        state: "suggested",
        action: "course",
        basis: "explicit-request",
        uncertainty: "“Friday” is not a confirmed calendar date.",
      },
      {
        id: "step-outline",
        title: "Prepare the two-page research outline",
        why: "The message explicitly asks for a two-page outline. Create a private working draft.",
        source: thesis,
        courseId: "course-political",
        goalId: "goal-research",
        destination: "Workspace",
        state: "suggested",
        action: "document",
        basis: "explicit-request",
        uncertainty: "Confirm which Friday before scheduling submission.",
      },
      {
        id: "step-reply-professor",
        title: "Acknowledge the requested revision",
        why: "A reply can confirm that you understand the next steps; it is optional until you choose it.",
        source: thesis,
        courseId: "course-political",
        destination: "Dashboard",
        state: "suggested",
        action: "reply",
        basis: "user-goal",
      },
      {
        id: "step-confirm",
        title: "Confirm your interview availability",
        why: "The recruiter explicitly requested confirmation for 12 November at 14:00 CET.",
        source: interview,
        opportunityId: "opportunity-policy",
        goalId: "goal-policy",
        destination: "Dashboard",
        state: "suggested",
        action: "reply",
        basis: "explicit-request",
        deadline: "2026-11-12T13:00:00Z",
      },
      {
        id: "step-calendar",
        title: "Review the interview calendar proposal",
        why: "Keep the source invitation attached to the event after you confirm the time.",
        source: interview,
        opportunityId: "opportunity-policy",
        destination: "Calendar",
        state: "suggested",
        action: "calendar",
        basis: "explicit-request",
        deadline: "2026-11-12T13:00:00Z",
      },
      {
        id: "step-preparation",
        title: "Prepare a relevant research example for the interview",
        why: "The invitation requests a short example of your research. Review permitted portfolio material.",
        source: interview,
        opportunityId: "opportunity-policy",
        goalId: "goal-policy",
        destination: "Roadmaps",
        state: "suggested",
        action: "goal",
        basis: "explicit-request",
      },
      {
        id: "step-documents",
        title: "Review the requested supporting documents",
        why: "The placement asks for a writing sample and enrolment certificate by 20 November 2026.",
        source: source(
          "workflow-documents",
          "Please submit your writing sample and enrolment certificate by 20 November 2026.",
        ),
        opportunityId: "opportunity-documents",
        goalId: "goal-policy",
        destination: "Passport",
        state: "suggested",
        action: "task",
        basis: "explicit-request",
        deadline: "2026-11-20",
      },
    ],
    documents: [],
  };
}
export function sortedSteps(steps: NextStep[]) {
  return [...steps].sort(
    (a, b) =>
      (a.state === "dismissed" ? 1 : 0) - (b.state === "dismissed" ? 1 : 0) ||
      (a.deadline ? Date.parse(a.deadline) : Infinity) -
        (b.deadline ? Date.parse(b.deadline) : Infinity) ||
      (a.basis === "explicit-request" ? 0 : 1) -
        (b.basis === "explicit-request" ? 0 : 1),
  );
}
export function approveEvent(
  state: WorkspaceState,
  id: string,
  event: CalendarEvent,
): WorkspaceState {
  const proposal = state.proposals.find((p) => p.id === id);
  if (!proposal || proposal.state !== "proposed") return state;
  validateEvent(event);
  if (
    event.source?.threadId !== proposal.event.source?.threadId ||
    event.source?.accountId !== proposal.event.source?.accountId ||
    event.source?.messageId !== proposal.event.source?.messageId
  )
    throw new Error("Calendar source provenance must be preserved");
  return {
    ...state,
    events: [...state.events.filter((e) => e.id !== event.id), event],
    steps: state.steps.map((s) =>
      event.kind === "deadline" && s.source.threadId === event.source?.threadId
        ? { ...s, deadline: event.start, uncertainty: undefined }
        : s,
    ),
    proposals: state.proposals.map((p) =>
      p.id === id ? { ...p, state: "approved", event } : p,
    ),
  };
}
export function validateEvent(event: CalendarEvent) {
  if (!event.title.trim()) throw new Error("An event title is required");
  if (
    !Number.isFinite(Date.parse(event.start)) ||
    !Number.isFinite(Date.parse(event.end)) ||
    Date.parse(event.end) <= Date.parse(event.start)
  )
    throw new Error("End must be after start");
  if (event.allDay) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(event.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event.end) ||
      new Date(event.start).toISOString().slice(0, 10) !== event.start ||
      new Date(event.end).toISOString().slice(0, 10) !== event.end
    )
      throw new Error("All-day events require valid calendar dates");
  } else if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(event.start) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(event.end)
  )
    throw new Error("Timed events require an explicit offset");
  try {
    new Intl.DateTimeFormat("en", { timeZone: event.timezone });
  } catch {
    throw new Error("Use a valid IANA timezone");
  }
  if (![0, 5, 15, 30, 60, 1440].includes(event.reminderMinutes))
    throw new Error("Choose a supported reminder");
}
const sourceSchema = z.object({
  threadId: z.string(),
  messageId: z.string(),
  accountId: z.string(),
  excerpt: z.string(),
});
const eventSchema = z.object({
  version: z.literal("syrka.calendar.event/1"),
  id: z.string(),
  title: z.string(),
  kind: z.enum(["meeting", "deadline", "exam", "interview", "course"]),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  timezone: z.string(),
  reminderMinutes: z.number(),
  source: sourceSchema.optional(),
  relatedId: z.string().optional(),
});
const workspaceSchema = z.object({
  version: z.literal(1),
  events: z.array(eventSchema),
  proposals: z.array(
    z.object({
      id: z.string(),
      state: z.enum(["proposed", "approved", "dismissed"]),
      event: eventSchema,
      uncertainty: z.string(),
    }),
  ),
  courses: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      title: z.string(),
      professor: z.string(),
      membership: z.string(),
      goalId: z.string(),
      readings: z.array(z.string()),
    }),
  ),
  associations: z.array(
    z.object({
      threadId: z.string(),
      courseId: z.string(),
      confirmedBy: z.enum(["demo-membership", "user"]),
      evidence: z.string(),
    }),
  ),
  opportunities: z.array(
    z.object({
      id: z.string(),
      threadId: z.string(),
      title: z.string(),
      organization: z.string(),
      stage: z.enum(stages),
      goalId: z.string(),
      documents: z.array(z.string()),
      deadline: z.string().optional(),
    }),
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      path: z.string(),
      capabilities: z.array(z.string()),
      evidence: z.array(z.string()),
    }),
  ),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      why: z.string(),
      source: sourceSchema,
      courseId: z.string().optional(),
      opportunityId: z.string().optional(),
      goalId: z.string().optional(),
      deadline: z.string().optional(),
      destination: z.enum([
        "Campus",
        "Roadmaps",
        "Dashboard",
        "Calendar",
        "Workspace",
        "Passport",
      ]),
      state: z.enum(["suggested", "approved", "completed", "dismissed"]),
      action: z.enum([
        "reply",
        "calendar",
        "course",
        "goal",
        "document",
        "task",
      ]),
      basis: z.enum(["explicit-request", "user-goal"]),
      uncertainty: z.string().optional(),
    }),
  ),
  documents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      text: z.string(),
      source: sourceSchema,
    }),
  ),
});
export function restoreWorkspace(raw: string | null): WorkspaceState {
  try {
    const parsed = workspaceSchema.safeParse(JSON.parse(raw || "null"));
    if (!parsed.success) return seedWorkspace();
    for (const event of parsed.data.events) validateEvent(event);
    for (const proposal of parsed.data.proposals)
      if (proposal.event.start || proposal.event.end)
        validateEvent(proposal.event);
    return parsed.data;
  } catch {
    return seedWorkspace();
  }
}

/** Upgrade existing demo choices without importing them into the real Mail backend. */
export function workspaceForDemo(
  raw: string | null,
  legacyStages: Record<string, string>,
): WorkspaceState {
  const state = restoreWorkspace(raw);
  if (raw) return state;
  const old: Record<string, Stage> = {
    Exploring: "Interested",
    Review: "Assessment",
    Closed: "Withdrawn",
  };
  return {
    ...state,
    opportunities: state.opportunities.map((o) => {
      const value = legacyStages[o.threadId];
      const stage =
        old[value] ||
        (stages.includes(value as Stage) ? (value as Stage) : o.stage);
      return { ...o, stage };
    }),
  };
}
