'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { BrandUserRow } from '@/lib/queries/brandUsers';
import type { Target } from '@/types';
import { CreatorDiscoveryHub } from './CreatorDiscoveryHub';
import { TargetsSpreadsheet } from './TargetsSpreadsheet';
import { readTargetPlatforms, toggleTargetPlatform } from './target-platform-filter';
import type { PlatformValue } from './targets-constants';

/** One URL-owned selection for discovery and the table, including back/forward/reload. */
export function TargetsWorkspace({ targets, brands }: {
  readonly targets: Target[];
  readonly brands: BrandUserRow[];
}): React.ReactElement {
  const searchParams = useSearchParams();
  const platforms = useMemo(() => readTargetPlatforms(searchParams), [searchParams]);
  const platformFilter = useMemo(() => new Set(platforms), [platforms]);

  const selectPlatforms = (next: readonly PlatformValue[]): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('platforms', next.length > 0 ? next.join(',') : 'all');
    if (url.href === window.location.href) return;
    // Next integrates native history with useSearchParams; no server refetch or scroll reset.
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const togglePlatform = (platform: PlatformValue): void => {
    // Read the latest URL so rapid clicks do not overwrite another selection before a render.
    selectPlatforms(toggleTargetPlatform(readTargetPlatforms(new URLSearchParams(window.location.search)), platform));
  };

  return (
    <>
      <CreatorDiscoveryHub
        tab={platforms[0] ?? 'youtube'}
        platforms={platforms}
        onTabChange={(platform) => selectPlatforms([platform])}
      />
      <TargetsSpreadsheet targets={targets} brands={brands} platformFilter={platformFilter} togglePlatform={togglePlatform} />
    </>
  );
}
