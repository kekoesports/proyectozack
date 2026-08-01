import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Legacy P&L URL. Forward query string so filter deep-links survive the move
 * to /admin/finanzas/pl (QA 2026-07-31: bare redirect dropped ?company/from/to…).
 */
export default async function PnLPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<never> {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim() !== '') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (v.trim() !== '') params.append(key, v);
      }
    }
  }
  const qs = params.toString();
  redirect(qs ? `/admin/finanzas/pl?${qs}` : '/admin/finanzas/pl');
}
