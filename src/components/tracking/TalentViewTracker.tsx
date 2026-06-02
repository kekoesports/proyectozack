'use client';

import { useEffect, useRef } from 'react';

type Props = { readonly talentId: number };

export function TalentViewTracker({ talentId }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    // WHY: fire-and-forget — integración con API imperativa de tracking que no encaja en RSC
    if (fired.current) return;
    try {
      if (sessionStorage.getItem(`tv-${talentId}`)) return;
    } catch { /* sessionStorage bloqueado en Safari privado — la capa hash del servidor cubre el dedup */ }

    fired.current = true;

    void fetch('/api/talents/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ talentId }),
      keepalive: true,
    }).then(() => {
      try { sessionStorage.setItem(`tv-${talentId}`, '1'); } catch { /* intentional */ }
    }).catch(() => { /* intentional no-op — el fallo de tracking nunca afecta la lectura */ });
  }, [talentId]);

  return null;
}
