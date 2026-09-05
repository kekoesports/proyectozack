# Internal CRM ↔ n8n ↔ Discord delivery guard

This is a deterministic companion to the existing n8n workflows, not an AI agent,
the CRM application or the agent worker. It does not use a model, database
credential, invoice, banking, email or contract API. The published UI is unchanged.

## Deployment and ownership

- One named Docker container: `socialpro-internal-guard`, Node runtime from the
  already installed CRM image. No host ports, no privileged capabilities, read-only
  root filesystem, non-root UID 1000, 0.25 CPU and 256 MiB memory limit.
- Shared with n8n only through its existing private automation network. HTTPS
  egress is restricted by the client code to the CRM and Discord API origins.
  This code-level destination restriction is not a claim of network firewalling.
- Read-only private configuration: `/config/config.json`. Persistent writable
  journal: `/data`. Read-only service files: `/service`.
- Configuration contains the existing CRM bearer and Discord bot token. Never
  commit it, print it, return it in HTTP results or include it in plain-text
  exports. The production directory and files are private; encrypted backup
  coverage must include this directory before deleting or rebuilding the host.
- Host custody and deployment manifests/hashes are recorded in the private
  operational continuity file. The service directory is **not disposable scratch**.
  Do not prune it because its parent contains the word maintenance.

## Initialization and restart

`initialize.cjs` is an explicit, one-time operation on an empty data directory.
It creates fixed T0 policies and both polling checkpoints. The normal server
must find that policy; it never recreates a missing journal or resets T0.
Do not rerun the initializer to recover a damaged or accidentally empty volume.

Per-family and per-message operations are serialized. Directory locks also
exclude separate processes; a lock left by a crash is deliberately not reclaimed
automatically. Atomic rename, file fsync, directory fsync on Linux and readback
precede external delivery. Stop/redeploy only after checking there are no active
operations. A lost or uncertain receipt requires reconciliation, not a blind retry.

## Effects allowed

| Family | Behavior |
|---|---|
| Pipeline | Read new human messages in the configured internal channel; create incomplete CRM drafts through the existing idempotent endpoint; react only to newly created drafts. |
| KPI | New commands from the verified internal actor list; GET digest/detail only. `zack revisa`, `zack detalle <consulta>`, `zack ayuda`. Financial aliases have no effect. |
| Intake | Authenticated internal Discord source and snowflake newer than T0. Arbitrary API/manual imports are not enabled by this restoration. |
| Deal-created | Fixed internal destinations; reviewedAt newer than T0; existing CRM Sheet/share result; Discord receipt before idempotent CRM ACK. |
| Daily | Current Madrid date, 10:00 hour only, immutable multipart plan and daily delivery keys. An authenticated probe reads/formats without sending. |
| Progress | Tracking sync and future internal milestones only. Financial and reminder branches are absent. See progress module for first-observation baseline and partial-sync handling. |

The seven AI schedules and main agent worker are not dependencies of these
deterministic flows. Telegram refill and Drive-copy workflows remain separately
disabled. Existing CRM approval behavior outside these n8n graphs is not replaced
or claimed to have been tested by this synthetic event.

## Delivery and failure semantics

The persistent journal is the primary deduplication control. Discord's
`nonce` + `enforce_nonce` provides an additional short-window check; it is **not**
a permanent exactly-once guarantee. See the
[Discord message API](https://docs.discord.com/developers/resources/message).

Once a send is uncertain, only a matching bot identity, channel, nonce, content
and receipt can establish recovery. Otherwise the affected item remains blocked;
other families can continue. Provider redirects are rejected and mention parsing
is disabled. Own reactions use Discord's idempotent PUT.

The latest-page readers stop rather than skipping a full page of unseen messages
beyond their persisted boundary. This bounded backlog condition needs an explicit
pagination/reconciliation repair; do not reset the checkpoint or replay history.
Do not ACK skipped historical deal-created notifications. A full oldest-25 CRM
notification page may need a cursor-capable API; monitor this boundary.

## Authentication and observations

All service routes, including health, require the existing CRM bearer. Allowed
routes are explicit own properties, never inherited object names. n8n's inbound
webhooks separately require Header Auth. No browser session, OTP or 2FA bypass.

Health reports process/storage availability, not completion of a business task.
Inspect n8n executions, the persisted operation result and the Discord receipt
before reporting functional success. Probes must not be presented as a scheduled
daily delivery, a real customer deal approval or a human KPI command.

## Verification and rollback

- `node --test "infra/n8n/guard/*.test.cjs"`
- `npx eslint "infra/n8n/guard/*.cjs"`
- Functional evidence: one clearly marked synthetic draft/event, one Discord
  message, same-ID replay, retry before delivery and replay after service restart.
- A narrow safe rollback unpublishes only the six changed internal workflows and
  stops this service once idle. Preserve all journal files and previous workflow
  snapshots. **Do not republish the former mixed financial/email workflows** as
  part of an automatic rollback.
- The import templates are deliberately `active:false` with credential bindings
  to resolve. Their checked runtime counterparts are published separately via the
  supported n8n API, recording each version and activation result.
