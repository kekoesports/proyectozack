---
read_when: Deploying or continuing the 14 September 2026 SocialPro GitHub resolution release.
---

# VPS release — 14 September 2026

The user explicitly authorized verification, pushing master and deploying the reviewed SocialPro services to the VPS. This supersedes the earlier no-deployment checkpoint in `github-resolution-2026-09-14.md`.

The initial master `534dc3a4` passed CI, CodeQL and WhatsApp reliability. Read-only runtime comparison found Zack and IP collector overlays absent from Git. This release preserves their running behavior: activation cutoff, Dev evidence, shared read-only Sentry, bounded quota recovery, complete reports and Gemini billable reasoning. The newer invalid-budget guards remain in place. Existing live mail FAQ source is now versioned, with its isolated replay tests. No agent seed, historical replay, recipient expansion or budget increase is part of deployment.

Deployment targets are the SocialPro CRM web, Studio web/render worker, WhatsApp worker, contact register, Zack worker, IP evidence collector and mail assistant. Existing credentials, networks, persistent data, restrictions and schedules must be retained. KekoPilot, TikTok LIVE landing, n8n, databases and WAHA provider sessions are separate services and must not be replaced by this application release.

Production PostgreSQL was identified read-only as `socialpro`, application role `socialpro_app`, PostgreSQL 17.6. Its latest migration timestamp is `1789295732267` (0164). Verify journal hashes and current schema before concluding no migration is required. Save a private backup before cutover; never print configuration, message contents or credentials.

Build exact Git archives, with the bounded host build lock, disposable PostgreSQL and synthetic build values. Do not use production data for prerendering. Preserve the existing public build configuration. Switch only the intended Caddy upstreams after candidate readiness and authorization-negative checks. Stop each singleton worker before starting its replacement. Retain stopped rollback containers, image digests and the exact pre-switch Caddy configuration; rollback must not restore or discard current business data.

Status at this source checkpoint: reconciled implementation under validation; production cutover not yet performed. Actual activation and verification evidence must be appended after deployment.
