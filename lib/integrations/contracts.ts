import type { ProposedAction } from "../actions";
/** Each destination must implement this contract using its own approved authorization.
 * Never accept an endpoint URL or credentials from an email or an AI response.
 */
export interface SyrkaActionAdapter {
  destination: ProposedAction["destination"];
  contractVersion: "syrka.mail.action/1";
  execute(
    action: ProposedAction,
    context: { userId: string; idempotencyKey: string; consentId: string },
  ): Promise<{ objectId: string; url?: string }>;
  undo?(
    objectId: string,
    context: { userId: string; consentId: string },
  ): Promise<void>;
}
export const integrationStatus = {
  dashboard: "contract-required",
  roadmaps: "contract-required",
  passport: "contract-required",
  campus: "contract-required",
  workspace: "contract-required",
  calendar: "contract-required",
  sessions: "contract-required",
} as const;
export const passportProjection = "syrka.capabilities/1";
