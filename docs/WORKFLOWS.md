# Inline replies, Mail Calendar and contextual workspaces

This extends the existing product and preserves its branding, true-black/light modes and mobile layout. No other Syrka app or database is modified.

## Inline replies

Reply, Reply All and Forward open beneath the selected conversation. Recipient details are collapsed until needed. Identity and subject come from the selected account/source; reply-all removes the user's own address and duplicates. The editor supports safe bold/italic/list formatting, plain-text paste, bounded .txt/.ics attachments and autosave. Dismissal/view changes retain drafts. Mobile reading/reply and task workspaces hide the floating Compose control; send controls respect safe-area spacing. Software-keyboard behavior was approximated using a reduced Chromium viewport, not tested on physical iOS hardware.

Demo replies persist as private browser-local drafts and append to the same fictional conversation. Forward creates a separate simulated outgoing thread. Demo sends never call a provider.

Live Gmail/Microsoft routes re-fetch the original message under the authenticated selected mailbox before sending. Gmail preserves the native thread ID and safe RFC Message-ID/References headers. Graph creates a native reply/reply-all/forward draft, patches reviewed content/recipients, attaches permitted files and sends that draft. HTML is sanitized server-side; raw incoming email HTML and remote images remain disabled. Delivery attempt receipts prevent automatic retries after uncertain outcomes. Native Zoho replies remain explicitly gated pending documented threading/API verification.

Live threading/delivery has only mocked provider-contract coverage, not authorized mailbox verification. Apply the inline-draft migration before activating live autosave. Uploads other than safe text/calendar files require a separately configured scanning pipeline.

## Calendar

Month (seven-column grid), week, day and agenda views provide period navigation, Today, search, event-type filters, IANA timezones, all-day events, create/edit/delete, reminder settings and source navigation. Time conversion rejects nonexistent or ambiguous DST times instead of silently choosing an offset. All-day end dates are exclusive.

Proposed events are a separate model and are absent from the grid until reviewed/approved. The interview proposal preserves the source's 14:00 CET as 13:00 UTC. Ambiguous “Friday” deadlines remain blank until the user confirms them. Approval is idempotent; existing source-linked events are reviewed rather than duplicated. Confirmed assignment deadlines update linked next-step context. Reminders display in the open demo within the configured window; no background email/push delivery is claimed.

Workspace Calendar remains the authoritative future live service. The reusable interface has a scoped, versioned Calendar adapter contract. Live mode offers empty calendar navigation with writes disabled until that adapter is authorized. No separate live calendar table/service is created inside Mail.

## Academic and Applications

Academic shows fictional Campus memberships, course requirements/schedules/exams, readings, professor correspondence and specific source-grounded next steps. Course associations come from labelled demo membership evidence or explicit user confirmation, never a vague AI guess. Working document drafts and Roadmaps preparation proposals are browser-local simulations.

Applications uses nine stages: Interested, Preparing, Applied, Assessment, Interview, Offer, Accepted, Rejected, Withdrawn. Source correspondence, requested documents, dates, goals and self-reported fictional Passport evidence remain linked. Reader/workspace stages agree, and older demo stage choices survive the upgrade. An invitation or user-edited stage never creates a verified capability or employment credential.

Shared next steps show the request, explanation, source excerpt, entity, confirmed deadline, destination and state. Suggestions can be approved, completed or dismissed. Explicit requests and confirmed dates determine order; there are no fabricated urgency scores. Relative dates remain marked uncertain. Qwen is not required: these demos use deterministic fixtures and user choices, not live model inference.

## Persistence and isolation

The demo contains 56 fictional messages, extending existing data without resetting edits. Mail and contextual workflow storage use separate versioned browser keys. They never synchronize to Supabase or live Syrka apps. Reset clears only demo data.

Live Campus, Roadmaps, Calendar, Dashboard and Passport integration contracts preserve user/tenant identity, consent scopes, idempotency and provenance. Their current status is **contract-only**, not live integrations. Roadmaps/Passport use the `syrka.capabilities/1` compatibility identifier. No production endpoint is invented and no graph node, credential, course record or shared file is silently changed.

Screenshots and executable browser acceptance tests cover source navigation, inline drafts/formatting/attachments, event approval/editing, course associations, application stages, Roadmaps next steps, dark/light modes and iPhone-sized layouts.
