import { parseDealTitle, parseDealSpecs } from '@/lib/parsers/socialpro-blocks';

export const SUBTYPE_LABELS: Record<string, string> = {
  dedicated_video: 'Videos',
  preroll:         'Prerolls',
  stream:          'Streams',
};

const SUBTYPES = ['dedicated_video', 'preroll', 'stream'] as const;

type Props = {
  currentCounts: Record<string, number>;
  dealName?: string;
};

export function SubtypeBreakdown({ currentCounts, dealName }: Props) {
  const targets: Record<string, number> = {};
  if (dealName) {
    const parsed = parseDealTitle(dealName);
    if (parsed) {
      const specs = parseDealSpecs(parsed.specsStr);
      for (const spec of specs) {
        const t = spec.rawType.toLowerCase().trim();
        if (t.includes('dedicated') || t === 'video' || t === 'vídeo' || t.includes('videos')) {
          targets['dedicated_video'] = spec.count;
        } else if (t === 'preroll' || t === 'prerolls') {
          targets['preroll'] = spec.count;
        } else if (t === 'stream' || t === 'streams' || t.includes('livestream')) {
          targets['stream'] = spec.count;
        }
      }
    }
  }

  const hasAny = SUBTYPES.some((s) => (currentCounts[s] ?? 0) > 0 || (targets[s] ?? 0) > 0);
  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-2xl border border-sp-border p-4">
      <h3 className="text-xs font-bold text-sp-muted uppercase tracking-wide mb-3">Desglose por tipo</h3>
      <div className="flex gap-6 flex-wrap">
        {SUBTYPES.map((s) => {
          const current = currentCounts[s] ?? 0;
          const target  = targets[s];
          if (current === 0 && !target) return null;
          return (
            <div key={s} className="text-center">
              <p className="text-lg font-black text-sp-dark">
                {current}{target != null ? `/${target}` : ''}
              </p>
              <p className="text-xs text-sp-muted">{SUBTYPE_LABELS[s]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
