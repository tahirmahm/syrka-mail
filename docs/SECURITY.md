> Current additions: scoped JWT/RLS drafts and preferences, cookie-based PKCE sessions, project pinning, sanitized inline HTML, bounded safe attachments, and real local PostgreSQL two-identity tests are described in [BACKEND.md](BACKEND.md). These are not claims of remote advisor or live authentication verification.

# Security and privacy model

The browser supplies a Supabase user access token; every protected route verifies it against Supabase Auth. The service role is never sent to the client. Server queries explicitly constrain user_id, and privileged tables have browser privileges revoked with RLS enabled. Test this against a dedicated database with two users before rollout; SQL inspection alone is not proof of isolation.

Provider credentials use AES-256-GCM with random 96-bit nonces and authenticated tags. The encryption key lives only in server configuration. Email and token values must never enter logs. The provider account endpoint returns metadata only. Disconnect removes local provider credentials, not independently approved Passport records.

OAuth uses one short-lived state-bound HttpOnly cookie; Microsoft and Google use S256 PKCE. Registered redirects come from server APP_URL. Zoho data-center destinations are allowlisted to prevent arbitrary outbound requests. Account access is delegated. No administrative mail-reading permission is requested.

API writes require an Authorization header, not ambient cookies; the OAuth callback has its own cryptographic state protection. Application auth uses official browser-SDK cookie sessions. HttpOnly application sessions, a stronger CSP, shared-device handling, audit logging, provider revocation and complete data export/deletion controls remain production prerequisites.

Messages are plain text. HTML email is never inserted with dangerouslySetInnerHTML. Remote images, scripts, tracking pixels and attachment execution are unsupported, preventing incidental remote loads. Full HTML sanitization, file validation, size limits and scanning must precede adding HTML/attachment support.

AI only receives explicitly selected message text after a confirmation; no tools are exposed to the model. Email content is treated as untrusted data. AI returns validated text and cannot execute actions. Free quota must be verified and unexpired; no fallback model/provider is used. Current rate limits are per user and minute; account-wide quotas, retention cleanup and abuse monitoring remain required.

Action proposals retain source account/message references and supporting excerpts. Only approved destinations are accepted. The service cannot execute cross-app effects until an authorized, versioned adapter exists. Approval does not mean completion. Passport evidence may never become an issuer-verified credential merely because it came from email.

Delivery attempts are inserted before provider sending with a unique UUID. A repeated key is rejected, and uncertain outcomes require checking provider Sent before retrying. This does not guarantee global exactly-once email delivery. Scheduled/undo send are not advertised or implemented.

No end-to-end encryption claim is made. Third-party mailbox and AI providers remain data processors. Institutional retention, GDPR processing terms and minors' data requirements require appropriate review before deployment.
