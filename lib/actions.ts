import { z } from "zod";
export const destination = z.enum([
  "dashboard",
  "roadmaps",
  "passport",
  "campus",
  "workspace",
  "calendar",
  "sessions",
]);
export const proposedAction = z.object({
  version: z.literal("syrka.mail.action/1"),
  sourceMessageId: z.string().min(1).max(300),
  sourceAccountId: z.string().uuid(),
  sourceThreadId: z.string().max(300).optional(),
  destination,
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  excerpt: z.string().min(1).max(1000),
  dueAt: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().max(80).optional(),
  ambiguity: z.string().max(1000).optional(),
});
export type ProposedAction = z.infer<typeof proposedAction>;
export const transitions: Record<string, string[]> = {
  proposed: ["approved", "dismissed"],
  approved: ["dismissed"],
  failed: ["approved", "dismissed"],
  dismissed: [],
  executing: [],
  completed: [],
};
export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) || false;
}
