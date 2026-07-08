/**
 * Sanea metadata de `sp_audit_events` para la vista admin.
 *
 * La metadata jsonb puede contener campos operativos (giveawayId,
 * coinsEarned, missionSlug, adminUserId, etc.) pero también podría
 * incluir accidentalmente PII si un futuro callsite se despista.
 *
 * Reglas:
 *   1. Solo se muestran keys en la whitelist explícita.
 *   2. Cualquier key cuyo nombre coincida con `SENSITIVE_KEY_PATTERN`
 *      se sustituye por `'[redacted]'`.
 *   3. Strings largos (>200 chars) se truncan a 200 + '…'.
 *   4. Todas las demás keys se agrupan en `_hidden_keys: N`.
 *
 * No confía en el remitente — se aplica al render, no al insert.
 */

const WHITELIST_METADATA_KEYS = new Set<string>([
  'giveawayId',
  'winnerCount',
  'entriesCount',
  'adminUserId',
  'shopItemId',
  'costCoins',
  'category',
  'coinsEarned',
  'missionsCompleted',
  'missionSlug',
  'missionKey',
  'isFree',
  'consentVersion',
  'partnerId',
  'partnerKey',
  'source',
  'reason',
  'streakDay',
  'day',
  'error',
]);

const SENSITIVE_KEY_PATTERN = /(email|token|secret|password|apiKey|api_key|authorization|cookie|jwt|refresh|access|steamId|tradeUrl|address|phone|nif|dni|iban|card|cvv)/i;

const MAX_STRING_LENGTH = 200;
const MAX_STRING_KEEP = 199;

export interface RedactedMetadata {
  readonly visible: Record<string, unknown>;
  readonly hiddenCount: number;
}

export function redactAuditMetadata(input: unknown): RedactedMetadata {
  if (input === null || input === undefined) {
    return { visible: {}, hiddenCount: 0 };
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { visible: { value: truncateValue(input) }, hiddenCount: 0 };
  }

  const visible: Record<string, unknown> = {};
  let hiddenCount = 0;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      visible[key] = '[redacted]';
      continue;
    }
    if (WHITELIST_METADATA_KEYS.has(key)) {
      visible[key] = truncateValue(value);
      continue;
    }
    hiddenCount += 1;
  }

  return { visible, hiddenCount };
}

function truncateValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    return value.slice(0, MAX_STRING_KEEP) + '…';
  }
  return value;
}

const MAX_IP_HASH_VISIBLE = 12;
const MAX_USER_AGENT_VISIBLE = 60;

export function truncateIpHash(ipHash: string | null | undefined): string {
  if (!ipHash) return '—';
  return ipHash.slice(0, MAX_IP_HASH_VISIBLE);
}

export function summarizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return '—';
  const first = userAgent.split(/[()]/)[0]?.trim() ?? userAgent;
  if (first.length > MAX_USER_AGENT_VISIBLE) return first.slice(0, MAX_USER_AGENT_VISIBLE - 1) + '…';
  return first;
}
