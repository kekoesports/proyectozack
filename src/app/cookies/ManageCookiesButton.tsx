'use client';

import { openConsentBanner } from '@/lib/consent/consentStore';

export function ManageCookiesButton() {
  return (
    <button
      type="button"
      onClick={openConsentBanner}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sp-border text-sm font-semibold text-sp-dark hover:border-sp-orange hover:text-sp-orange transition-colors"
    >
      Gestionar mis preferencias de cookies
    </button>
  );
}
