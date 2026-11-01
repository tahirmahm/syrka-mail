# Permissioned Syrka action contracts

`lib/actions.ts` defines `syrka.mail.action/1`: source message/account/thread, destination, proposed title/description, supporting excerpt, optional timestamp/timezone and ambiguity. Dates must include offsets; ambiguous dates require user review rather than automatic scheduling.

`lib/integrations/contracts.ts` specifies execute/optional undo with authenticated user context, consent ID and idempotency key. Endpoints must come from approved configuration, never email text or model output. There are no speculative URLs or cross-app network writes.

| Destination | Intended authorized object                             | Boundary                                                                        |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Dashboard   | Minimal task or deadline summary plus source reference | No full mailbox replication                                                     |
| Roadmaps    | Proposed opportunity/application/preparation link      | No automatic career-node completion                                             |
| Passport    | User-reviewed evidence or application-history entry    | Preserve `syrka.capabilities/1` compatibility; no automatic verified credential |
| Campus      | Private course/assignment association                  | Course membership required; no public correspondence publication                |
| Workspace   | Private document draft or selected attachment          | Explicit file selection; no hidden disclosure                                   |
| Calendar    | Reviewed date/time/deadline event                      | Timezone, ambiguity and DST confirmation                                        |
| Sessions    | Authorized meeting-link proposal                       | No automatic transcript distribution                                            |

Current Mail-side proposals can be saved, approved or dismissed through authenticated APIs. Approved proposals remain approved until a real destination adapter is authorized. No generic executor marks them complete. Edit, execution, failure recovery and undo require further implementation and contract tests.

## Provider extensibility

`MailProviderAdapter` currently exposes implemented list/read/send/mutation and selected attachment capabilities. Missing operations are not implied by interface existence. Adding IMAP/SMTP, Stalwart or institutional adapters must preserve account isolation and server-side credentials, and add explicit capability tests. Do not add browser-stored mailbox passwords. The interface must be expanded for complete thread/draft/attachment-upload/sync support before the full provider-neutral milestone is satisfied.

## Background processing

`mail_jobs` is a durable queue schema only. A production worker needs atomic claim/lease, bounded attempts, exponential backoff respecting Retry-After, persistent provider cursors, cancellation, deduplication and lease recovery. No scheduler or webhook is live. Delayed delivery must be cancellable before any Undo Send UI can be offered.
