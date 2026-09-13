# Recovery-only source capture — 2026-09-13

DO NOT MERGE OR DEPLOY. This PR archives separately recoverable source versions; it does not replace the master application, apply migrations, restart services or change proxy routing. The efficiency guards are exclusively in PR #469.

## Provenance

Git comparison base: f778b3f0dc01f0fea0f4a5cf29ac72d385d2db3e (master when capture began).

| Component | Source observed on VPS | Known base / qualification |
|---|---|---|
| web | /home/deploy/socialpro-keydrop-curly-zack-20260911 | .release-sha identifies f8f97825c39d99e52821c5b8999b4a9b4479d35a; subsequently patched. NOT an exact commit of the live release. Deployment manifest identifies this source and prior socialpro-stats-20260911 base. |
| worker | /home/deploy/socialpro-waha-onboarding-v2-20260910 | Same .release-sha base; src, infra/creator-intake and tsconfig.json are live read-only bind mounts into socialpro-waha-worker. Source capture is not only the older underlying image. |
| studio | /opt/socialpro/studio-widgets-release-20260907/source | Compose labels identify this directory. Image tag references cc6bb03ad1c7; not independently established as a complete Git commit. |
| WAHA | upstream https://github.com/devlikeapro/waha | Official external image, not locally built agency code. Digest and upstream revision in inventory.json. No session or third-party image export. |

The inventory records exact observed image IDs/digests, container IDs, ports, networks, mount paths and health status. No environment values, command secrets, volume contents or health logs exported. Health commands are represented by hashes, not raw potentially sensitive shell strings.

These are source-directory captures, not a claim of reproducible image equality: image builds did not carry a complete signed source manifest. CRM and Studio contain compiled output; no attempt to decompile or publish bundled environment values. Public assets/OCR models, docs, .env, sessions, backups, private logs, runtime data and dependencies are excluded. Database migration SOURCE files are archived only, never executed. Files over 5 MB, symlinks, non-UTF8 files and filenames indicating private credentials/backups are omitted by the allowlist.

## Recovering exact selected source bytes

Each component manifest lists the authoritative selected files, SHA-256 and storage mode. Files identical to the comparison base are referenced by Git; CRLF-only differences use a deterministic conversion; other files are stored under their original relative path with `.source` appended. This prevents snapshots from being executed by TypeScript, routes, CI or deployment tooling. It also preserves different module versions without overwriting one with another.

`node .recovery/restore.cjs web ABSOLUTE_NEW_DIRECTORY`

Use worker or studio for other captures. The tool refuses an existing output directory, checks path traversal and verifies every output hash. It has no network, DB, deployment or package-install behavior. A withheld-secret-candidate entry blocks reconstruction until separately reviewed; it is never silently replaced with master. Use only manifest-listed files, not a blind overlay onto master: master-only files may not belong to that release.

## Dependencies observed; not exhaustive

- Caddy routes socialpro.es to keydrop-curly-zack and app.socialpro.es to studio-widgets. Other upstreams still reference f8f97825. Nothing stopped or consolidated.
- f8f97825 remains on socialpro_creator_outreach in addition to CRM backend and edge. The daily radar has release pins; do not repoint them during source recovery.
- Main scheduler mount: /home/deploy/.config/socialpro/zack-20260911/scheduler-crontab. Observed jobs: snapshot-metrics (0 6 daily), discover-creator-targets (every 5 min), sync-news-alerts (0 7 daily), sync-ip-evidence (30 22 daily), sync-sheet-sources (0 23 daily), rollover-tasks (0 5 Monday), sync-metrics (0 7 Monday), giveaway-lifecycle (minute 7 hourly), poll-live-status (every 5 min), collect-creator-live-audience (every 10 min), sync-task-notices (every minute). Cron timezone not independently verified; schedules preserved as written.
- Outreach scheduler: /opt/socialpro/crm/scheduler/creator-outreach-crontab. sync-creator-applications (45 9 daily), discover-creator-targets and poll-live-status (every 5 min), collect-creator-live-audience (every 10 min). Overlap does not prove duplicate effects: destination and dedupe must be audited before changing schedules.
- Internal guard mounts service, private config and durable data beneath /opt/socialpro/maintenance/internal-restoration-20260905/guard; those private contents are excluded.
- studio-render worker runs separately on CRM backend, with private storage mount.
- contact-register consumes its own mounted source /home/deploy/socialpro-contact-register-20260912. Identified as an additional dependency, not included in the three requested source captures.
- Host timers observed: socialpro-backup-remote and socialpro-guardian-collector. No timer settings changed.
- Consumer enumeration uses literal references in container configuration plus observed proxy/scheduler mounts. It does not prove absence of references in n8n DB, DNS aliases or application data. No database queried to enumerate those.

## Verification and limitations

All 8,226 selected file hashes verified locally: web 2,774, worker 2,764, Studio 2,688. Compared with master, respectively 101 / 94 / 219 files require source overlays; 2,638 / 2,639 / 2,321 differ only by deterministic CRLF conversion; 35 / 31 / 148 are byte-identical Git references. No withheld entries remain. Candidate credential strings were already tracked test fixtures or a reviewed loopback-only synthetic Studio fixture, not production credentials. Gitleaks 8.30.1 scan of the final archive: zero leaks. Restore script syntax check passed. This verifies source integrity, not runtime correctness.

Read-only final container inspection retained the five recorded container IDs. Additional QA/build containers were visible from concurrent activity; this task did not create, restart or modify them. This inventory is a point-in-time observation, not a lock on other operators.

Capture used read-only SSH and local transfer hashing. No credentials copied into Git. Exact image and worker identity data must be rechecked before a future deployment. This PR is archival; runtime TypeScript/build verification of reconstructed releases remains pending and must use isolated dependencies/database fixtures. Original Windows worktrees untouched.

Next: reconcile recovered source; port #469 only after review; audit WAHA/worker identity and duplicate conversations; missed replies; build/OOM diagnosis; isolated tests; blue/green plan. Final approval required before proxy changes.
