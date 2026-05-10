'use client';

import { useEffect } from 'react';
import { captureAttributionFromUrl } from '@/lib/attribution';

export function AttributionCapture() {
  useEffect(() => {
    // Integración con Web Storage API: leer URLSearchParams y persistir
    // utm_*/creator en sessionStorage para enriquecer eventos posteriores.
    captureAttributionFromUrl();
  }, []);
  return null;
}
