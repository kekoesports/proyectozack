'server-only';

import type { BankTransaction, TransactionMatchType } from '@/types';

// ── Candidate types ───────────────────────────────────────────────────

export type MatchCandidate = {
  readonly entityId: number;
  readonly matchType: TransactionMatchType;
  // Expected direction for this entity type:
  // issued_invoice + income; expense + expense; internal_invoice + income
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly date: Date;
  readonly name: string;
  readonly reference?: string | null;
};

export type MatchResult = {
  readonly matchedEntityId: number;
  readonly matchType: TransactionMatchType;
  readonly confidence: number;
  readonly matchReason: string;
};

// ── Scoring ───────────────────────────────────────────────────────────

const SCORE_AMOUNT_EXACT = 50;
const SCORE_AMOUNT_CLOSE = 20;   // within 1 EUR
const SCORE_DATE_SAME = 20;      // same day
const SCORE_DATE_CLOSE = 10;     // within 3 days
const SCORE_NAME_CONTAINS = 15;
const SCORE_REFERENCE_MATCH = 15;
const SCORE_DIRECTION_MISMATCH = -100; // hard penalty — wrong direction never matches

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function dateDiffDays(a: Date, b: Date): number {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

function scoreCandidate(tx: BankTransaction, candidate: MatchCandidate): number {
  let score = 0;
  const reasons: string[] = [];

  // Direction filter — hard constraint
  if (tx.direction !== candidate.direction) {
    return SCORE_DIRECTION_MISMATCH;
  }

  // Amount scoring
  const txAmount = Math.abs(Number(tx.amount));
  const diff = Math.abs(txAmount - candidate.amount);
  if (diff === 0) {
    score += SCORE_AMOUNT_EXACT;
    reasons.push('importe exacto');
  } else if (diff <= 1) {
    score += SCORE_AMOUNT_CLOSE;
    reasons.push('importe aproximado');
  }

  // Date scoring
  const dayDiff = dateDiffDays(tx.bookingDate, candidate.date);
  if (dayDiff === 0) {
    score += SCORE_DATE_SAME;
    reasons.push('misma fecha');
  } else if (dayDiff <= 3) {
    score += SCORE_DATE_CLOSE;
    reasons.push(`${dayDiff}d de diferencia`);
  }

  // Name scoring
  if (candidate.name) {
    const txDesc = normalize(tx.description);
    const txCounterparty = normalize(tx.counterpartyName ?? '');
    const candidateName = normalize(candidate.name);
    if (
      txDesc.includes(candidateName) ||
      txCounterparty.includes(candidateName) ||
      candidateName.includes(txDesc)
    ) {
      score += SCORE_NAME_CONTAINS;
      reasons.push('nombre coincide');
    }
  }

  // Reference scoring
  if (candidate.reference && tx.reference) {
    const txRef = normalize(tx.reference);
    const candRef = normalize(candidate.reference);
    if (txRef === candRef || txRef.includes(candRef) || candRef.includes(txRef)) {
      score += SCORE_REFERENCE_MATCH;
      reasons.push('referencia coincide');
    }
  }

  return score;
}

// ── Public API ────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 50;

export function scoreMatches(
  transaction: BankTransaction,
  candidates: readonly MatchCandidate[],
): readonly MatchResult[] {
  const results: MatchResult[] = [];

  for (const candidate of candidates) {
    const score = scoreCandidate(transaction, candidate);
    if (score < CONFIDENCE_THRESHOLD) continue;

    const reasons: string[] = [];
    const txAmount = Math.abs(Number(transaction.amount));
    const diff = Math.abs(txAmount - candidate.amount);
    if (diff === 0) reasons.push('importe exacto');
    else if (diff <= 1) reasons.push('importe aproximado');
    const dayDiff = dateDiffDays(transaction.bookingDate, candidate.date);
    if (dayDiff === 0) reasons.push('misma fecha');
    else if (dayDiff <= 3) reasons.push(`${dayDiff}d de diferencia`);
    if (candidate.name) {
      const txDesc = normalize(transaction.description);
      const txCounterparty = normalize(transaction.counterpartyName ?? '');
      const candidateName = normalize(candidate.name);
      if (txDesc.includes(candidateName) || txCounterparty.includes(candidateName) || candidateName.includes(txDesc)) {
        reasons.push('nombre coincide');
      }
    }
    if (candidate.reference && transaction.reference) {
      const txRef = normalize(transaction.reference);
      const candRef = normalize(candidate.reference);
      if (txRef === candRef || txRef.includes(candRef) || candRef.includes(txRef)) {
        reasons.push('referencia coincide');
      }
    }

    results.push({
      matchedEntityId: candidate.entityId,
      matchType: candidate.matchType,
      confidence: Math.min(100, score),
      matchReason: reasons.join(', ') || 'coincidencia parcial',
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export function topMatch(
  transaction: BankTransaction,
  candidates: readonly MatchCandidate[],
): MatchResult | null {
  const results = scoreMatches(transaction, candidates);
  return results[0] ?? null;
}
