# Creator Discovery notifications — existing guard family

Local implementation, 5 September 2026. No workflow activation, network probe or
production delivery is performed by this change. It extends the existing guard,
not the AI worker or a second bot. Installation policy/hash, T0, initializer and
existing journal remain unchanged; do not reinitialize the data directory.

## Exact boundaries

- Authenticated `POST /run/creators`, body `{}`. Caller-supplied messages,
  recipients, filters or test payloads are rejected. A TEST must be a separately
  authorized synthetic CRM outbox entry, not a bypass in this handler.
- Handler export: `creators(ctx, body)` in `creators.cjs`, imported by `server.cjs`.
- CRM read: `GET /api/automation/discord/creator-discovery?since=<encoded-T0>` returns
  `{ok:true, notifications:[{id,eventKey,createdAt,guildId,channelId,message}]}`.
  The handler always sends `encodeURIComponent(config.reactivationAfter)`; the
  client permits only that exact encoded canonical ISO query, with no other
  parameters. The CRM filters `createdAt >= since` **before** its oldest-20 limit;
  historical rows stay intact and cannot fill the page ahead of new work.
  The bare compatibility GET remains allowlisted but is not used by this family.
  At most 20 items; six exact item fields; positive safe-integer `id`; no duplicate
  IDs/event keys in a page. The entire bounded page is checked before any send.
- `eventKey` matches `^creator-(run|status|test):[A-Za-z0-9:_-]{1,80}$`.
  `createdAt` is canonical `Date.toISOString()` UTC, at or after the existing
  `config.reactivationAfter`, never future. Older items are skipped without ACK,
  claim or delivery; historical data is not replayed or marked processed.
- `guildId === config.guildId` and `channelId === config.kpiChannelId`. No alternate
  recipient can be supplied. Nonempty `message` has at most 1800 UTF-16 code units;
  no split, AI transformation or fetched profile text is added by the guard.
- CRM ACK: `POST /api/automation/discord/creator-discovery/{id}/ack` with exactly
  `{messageId,channelId}` from the confirmed Discord receipt. `messageId` is a
  17–20 digit string; destination is the configured KPI channel. Reply must be
  `{ok:true,result:'acknowledged'|'duplicate'}`. Conflict/missing/ambiguous outcomes
  remain blocked; the CRM endpoint must make identical receipt ACKs idempotent.

## Order, persistence and failure

`ctx.lock('creators')` → bounded CRM page → all-item validation → durable plan →
`ctx.sendOnce('creator-discovery:' + eventKey, config.kpiChannelId, message)` →
validated receipt → CRM ACK → durable acknowledged plan.

- Plan key: `creator-notification:<eventKey>`; fixed-order fingerprint includes
  ID, event key, creation time, guild, channel and message. Changed content or
  destination under the same identity fails closed, not a second notification.
- Delivery key in the existing journal: `delivery:creator-discovery:<eventKey>`.
  The existing client persists its claim/receipt, disables mentions and uses a
  content-bound fingerprint plus Discord nonce. It does not promise universal
  exactly-once delivery.
- A Discord timeout leaves uncertainty; only existing receipt-reconciliation
  rules may resolve it. No blind POST and no CRM ACK without a valid receipt.
- ACK failure after delivery retains that receipt. Another poll calls sendOnce
  under the same key, receives the duplicate receipt and can retry the idempotent
  ACK, never intentionally resend the message. Unknown ACK results are not success.
- A confirmed plan replay checks its retained receipt and does not send or ACK
  again. First failure stops this page; untouched rows remain for a later poll.
- No new item starts after 90 seconds of family elapsed time. This is a dispatch
  budget, not a hard supervisor: an already-started request still uses the existing
  CRM/Discord timeout. It does not kill/restart a service or erase a stale lock.
- `status:creators` stores only counts, time and safe error codes/row IDs, not
  message content or credentials. Empty page means one read, zero send/ACK.

The new CRM allowlist admits only the exact list/ACK paths above. It does not
admit invoice, bank, email, contract, arbitrary query or arbitrary POST endpoints.
The outbox producer owns content minimization and purpose approval; authenticating
the CRM alone is not a guarantee that arbitrary message text contains no PII.

## Evidence and remaining gates

Local result: **31/31** family tests; **77/77** family/client/server tests;
**176/176** complete guard tests. Guard-wide ESLint passed. No external API was
called; server tests bind only an ephemeral loopback listener.

`node --test infra/n8n/guard/creators.test.cjs` exercises synthetic HTTP responses
and an in-memory journal using the real existing client. It covers replay/new
client context, concurrency, uncertain sends, failed/unknown ACK, destination,
T0/date/identity, size, page and CRM allowlists. It does not certify provider
delivery, filesystem crash recovery or production activation.

Before activation: verify the outbox migration/API, exact generated message,
same mounted policy/journal, new family route authentication and one authorized
TEST through CRM → guard → Discord → ACK. Reuse the same identity for replay and
check retained evidence after restart. Verify the deployed CRM supports the
`since` filter before activation; never ACK old rows to clear a page. A synthetic
20-old-plus-1-new fixture checks the contract locally, not its production rollout.

## Prepared n8n definition — NOT imported or active

[socialpro-creator-discovery-digest.json](../workflows/socialpro-creator-discovery-digest.json)
is a versioned, inactive definition only. This change does not import it into n8n,
activate a schedule, create a credential/bot, change a destination or run a TEST.

- Exactly two nodes: Schedule Trigger 1.2 every two minutes → HTTP Request 4.2,
  `POST http://socialpro-internal-guard:8787/run/creators`, literal JSON body `{}`.
  No webhook, command parser, external request, caller-supplied payload or provider
  discovery is present in this transport definition.
- Same placeholder `httpHeaderAuth` reference as the protected workflow templates.
  At an authorized import, bind the already-existing guard Header Auth credential;
  do not create another credential or paste its value into the JSON.
- Request timeout: 170 seconds; workflow limit: 180 seconds; no immediate n8n retry.
  A later scheduled poll reuses the guard's existing event identity, journal and
  receipt rules. A timeout is not delivery failure proof; never force a resend,
  reset the journal or advance T0 to hide an uncertain result.
- Two-minute polls can overlap an unusually long request; the existing persistent
  family lock serializes/refuses conflicting work. The definition does not claim
  that a timeout terminates a remote effect or guarantees exactly-once delivery.
- `active:false`, no remote workflow ID/version, no history/cursor override and no
  direct finance/email/outreach route. All existing policy, migration/API and
  same-identity TEST/receipt/ACK/replay checks above still apply before activation.

The local test `src/__tests__/server/n8n-creator-discovery-workflow.test.ts` validates
this transport contract and rejects altered external/financial routes and injected
message/destination/history bodies. It does not import, activate or execute n8n.
