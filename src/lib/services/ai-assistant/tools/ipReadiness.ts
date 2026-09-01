import 'server-only';

import { getIpReadinessAssistantSummary } from '@/lib/queries/ipEvidence';

/** Solo devuelve agregados; las descripciones y referencias del ledger no salen por Zack. */
export async function getIpReadinessSummary() {
  return getIpReadinessAssistantSummary();
}

