---
read_when: Deploying or continuing the 14 September 2026 SocialPro GitHub resolution release.
---

# VPS release — 14 September 2026

The user explicitly authorized verification, pushing master and deploying the reviewed SocialPro services to the VPS. This supersedes the earlier no-deployment checkpoint in `github-resolution-2026-09-14.md`.

The initial master `534dc3a4` passed CI, CodeQL and WhatsApp reliability. Read-only runtime comparison found Zack and IP collector overlays absent from Git. This release preserves their running behavior: activation cutoff, Dev evidence, shared read-only Sentry, bounded quota recovery, complete reports and Gemini billable reasoning. The newer invalid-budget guards remain in place. Existing live mail FAQ source is now versioned, with its isolated replay tests. No agent seed, historical replay, recipient expansion or budget increase is part of deployment.

Deployment targets are the SocialPro CRM web, Studio web/render worker, WhatsApp worker, contact register, Zack worker, IP evidence collector and mail assistant. Existing credentials, networks, persistent data, restrictions and schedules must be retained. KekoPilot, TikTok LIVE landing, n8n, databases and WAHA provider sessions are separate services and must not be replaced by this application release.

Production PostgreSQL was identified read-only as `socialpro`, application role `socialpro_app`, PostgreSQL 17.6. Its latest migration timestamp is `1789295732267` (0164). Verify journal hashes and current schema before concluding no migration is required. Save a private backup before cutover; never print configuration, message contents or credentials.

Build exact Git archives, with the bounded host build lock, disposable PostgreSQL and synthetic build values. Do not use production data for prerendering. Preserve the existing public build configuration. Switch only the intended Caddy upstreams after candidate readiness and authorization-negative checks. Stop each singleton worker before starting its replacement. Retain stopped rollback containers, image digests and the exact pre-switch Caddy configuration; rollback must not restore or discard current business data.

## Deployment and verification

**IMPLEMENTED:** master `283c3e74b12a4d313eac4f7a77b680d6492bae97` was pushed after every PR check passed. The four immutable images were built from `03e9b5bf8e06402a3e2ad3a54bc4b0bfd22793cc`; the only difference from validated master is the corrected Dev prompt assertion in `src/__tests__/server/operation-agents-definition.test.ts`. Production source is identical. Later documentation commits do not change those images.

**TESTED:** CI run `34824173873`, CodeQL `34824170279` and WhatsApp reliability `34824173835` passed. 437 suites / 6,660 tests passed, with one optional test skipped. The separate archive/mail checks passed 21/21. TypeScript, lint (two existing navigation warnings), migration metadata/drift, isolated PG17 build, production Docker PDF/OCR and safe worker boot passed. On the VPS, the exact Studio image rendered synthetic MP4s in 9:16, 1:1 and 16:9 with verified dimensions and duration. The same render check passed inside the active container after cutover, using temporary files and no customer media, database writes or provider calls.

The final GitHub sweep found new Dependabot PRs #478 and #479. Their individually successful CI runs (`34822265328`, `34822277490`) cover `@types/node` 24.13.4, fast-check 4.10.0 and espree 11.2.0; their histories are integrated in the final development-tool batch. PR #480 was closed without merging: `@eslint/js` 10 activates two lint errors in CI `34822331814`, while the supported engine remains ESLint 9. Recommended rules now share the existing major-upgrade hold for that engine; minor/patch updates remain enabled. This is a deferred coordinated migration, not a claim that ESLint 10 was repaired. Compared with image source `03e9b5bf`, application/worker code is unchanged. Of 755 production-marked lock entries only `@types/node` changes (declarations); executable production packages are unchanged. These test/type/parser and policy changes do not replace the already verified runtime images. Final combined checks must be verified before pushing master.

**ACTIVE:** Caddy switched only `socialpro.es` and `app.socialpro.es` at approximately 08:54 UTC. CRM and Studio candidates passed database readiness, login and unauthorized-access checks before switching. Public HTTPS checks passed for both sites; KekoPilot and TikTok LIVE remained reachable without changing their routes. Homepage talent links and image counts matched the previous release.

Browser verification used the user's existing authenticated CRM session: the dashboard rendered, all six active/shadow Zack definitions were visible, and `/admin/agents/runs/318` displayed completion, two successful READ tools and the persisted report. Studio rendered its login form after the expected redirect; authenticated Studio use was not verified. No authentication bypass or browser-side data mutation was used.

| Service | Active container | Image family |
| --- | --- | --- |
| CRM | `socialpro-crm-release-03e9b5bf8e06` | web |
| Studio | `socialpro-studio-release-03e9b5bf8e06` | web |
| WhatsApp | `socialpro-waha-reliability` | intake |
| Contact register | `socialpro-contact-register-reliability` | intake |
| Zack | `socialpro-zack-worker-20260911` | agents |
| IP collector | `socialpro-ip-evidence-20260911` | agents |
| Mail FAQ | `socialpro-mail-assistant` | agents |
| Native renderer | `socialpro-studio-render-1` | studio |

Image tags are `socialpro-release:<family>-03e9b5bf8e06`; full digests are retained in the private release receipt. All eight final instances were running with zero restarts. Runtime policies, credentials, persistent mounts and recipients were preserved; release metadata was updated. The first Zack/IP replacement attempt omitted their temporary mount and failed before useful work; both rolled back automatically. The helper was corrected to preserve `Tmpfs`, then both replacements succeeded. Read-only roots and capability restrictions remain in place.

**FUNCTIONING — measured boundaries:** fresh synthetic Dev run **318**, identity `TEST_SOCIALPRO_VPS_20260914_03e9b5bf_DEV`, started 08:58:14.969 UTC and succeeded 08:58:34.649 UTC on attempt 1. It persisted two successful READ calls (`getDevelopmentEvidence`, `getSentryIssues`) and a 1,139-character report. Sentry returned five actual unresolved application issues; these are separate from GitHub security alerts and were not represented as fixed. Estimated provider cost was USD0.009873, within unchanged budgets. Immediate replay and completed replay at 09:02:57 UTC reused run 318 with unchanged calls, cost and completion timestamp. The requested report length was a target, not a strict pass: the report exceeded 1,000 characters.

The active Zack heartbeat reports the image source SHA. All 11,817 historical pending events and other pre-cutoff status counts were unchanged. WhatsApp and contact-register health checks passed; existing inbox/outbox receipts survived replacement. No new WhatsApp message was sent as deployment QA; the latest observed accepted delivery predates cutover, so it is not evidence of a fresh production conversation on this image. Current implementation has the isolated PG17 reliability tests described above.

The contact register completed at 09:00:03 UTC with 94 discovered contacts, zero appended/updated rows and verified readback. Its **12 pre-existing ambiguous Drive rows remain guarded conflicts**, not repaired data. The watchdog still reports this data-review warning. Its cron now runs the versioned release source with the original state and cutoff. Task-notice scheduling now targets the new CRM; other schedules were retained. New mail polling executions 74418, 74426 and 74434 succeeded after replacement. Mail and IP endpoints rejected unauthenticated requests with 401. No fresh end-to-end IP collection or customer-mail delivery was forced by this deployment.

## Backup, rollback and evidence

All 165 repository migration timestamps and hashes matched production (216 retained journal rows); no migration or schema write was needed. A private custom-format backup was created and its directory successfully read with `pg_restore --list`: 4,268,375 bytes, SHA256 `222418088692a048970d08c4f45bf4c0fbd4e14cb4133a1b8622fbee1e7a9eb0`. This verifies a readable backup, not a restoration exercise.

Private evidence is under `/home/deploy/.config/socialpro/deploy-20260914/`: source/image receipts, CI gate, sanitized verification results, full previous container configurations, exact Caddy/scheduler backups and database backup. Configuration, private logs, receipts and backups must not be published.

Previous web containers `socialpro-crm-whatsapp-5fe20fe7` and `socialpro-studio-widgets-web-1` remain stopped. Each singleton worker has a stopped `<original-name>-rollback-03e9b5bf8e06` counterpart. Roll back workers one at a time: stop the new instance before restoring the old name and starting the previous image. For web rollback, start both previous web instances, validate readiness, then restore only the two reviewed Caddy upstreams (preserve any later unrelated changes). Restore the task-notice/watchdog target only if needed. Never roll back by restoring the database or deleting current delivery receipts. Automatic worker rollback was exercised during the temporary-mount correction; a full database restoration was not performed.
