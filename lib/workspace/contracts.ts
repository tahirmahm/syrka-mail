import type { CalendarEvent, Source, Course, Goal } from "./model";
export interface AuthorizedContext {
  userId: string;
  tenantId: string;
  scopes: ReadonlySet<string>;
  consentId: string;
}
export interface CampusAdapter {
  version: "syrka.campus.mail/1";
  listMemberships(context: AuthorizedContext): Promise<Course[]>;
  confirmAssociation(
    courseId: string,
    source: Source,
    context: AuthorizedContext,
  ): Promise<{ associationId: string }>;
}
/** Workspace Calendar remains the authoritative live service. Local demo events never sync automatically. */
export interface CalendarAdapter {
  version: "syrka.calendar.event/1";
  list(
    range: { start: string; end: string },
    context: AuthorizedContext,
  ): Promise<CalendarEvent[]>;
  create(
    event: CalendarEvent,
    idempotencyKey: string,
    context: AuthorizedContext,
  ): Promise<{ id: string }>;
  update(event: CalendarEvent, context: AuthorizedContext): Promise<void>;
}
export interface RoadmapsAdapter {
  version: "syrka.roadmaps.mail/1";
  projection: "syrka.capabilities/1";
  listGoals(context: AuthorizedContext): Promise<Goal[]>;
  proposePreparation(
    goalId: string,
    source: Source,
    idempotencyKey: string,
    context: AuthorizedContext,
  ): Promise<{ proposalId: string }>;
}
export interface DashboardAdapter {
  version: "syrka.dashboard.mail/1";
  proposeTask(
    input: { title: string; deadline?: string; source: Source },
    idempotencyKey: string,
    context: AuthorizedContext,
  ): Promise<{ proposalId: string }>;
}
export interface PassportAdapter {
  version: "syrka.passport.mail/1";
  projection: "syrka.capabilities/1";
  listAuthorizedEvidence(context: AuthorizedContext): Promise<
    {
      id: string;
      title: string;
      verification: "self-reported" | "issuer-verified";
    }[]
  >;
}
export const liveWorkspaceStatus = {
  calendar: "adapter-contract-only",
  campus: "adapter-contract-only",
  roadmaps: "adapter-contract-only",
  dashboard: "adapter-contract-only",
  passport: "adapter-contract-only",
} as const;
