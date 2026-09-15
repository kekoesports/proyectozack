'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/lib/locale';
import { trackEvent } from '@/lib/analytics';
import { getConsentSnapshot } from '@/lib/consent/consentStore';

type Props = {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly event: 'twitch_creator_profile_click' | 'twitch_case_study_click' | 'twitch_proposal_click';
  readonly placement: string;
  readonly pagePath: string;
  readonly language: Locale;
  readonly creator?: string;
  readonly caseStudy?: string;
};

export function TwitchTrackedLink({ href, children, className, event, placement, pagePath, language, creator, caseStudy }: Props) {
  const onClick = (): void => {
    try {
      // Recheck on each click, including after consent has been withdrawn.
      if (!getConsentSnapshot()?.analytics) return;
      trackEvent(event, {
        placement, page_path: pagePath, language,
        ...(creator ? { creator } : {}), ...(caseStudy ? { case_study: caseStudy } : {}),
      });
    } catch {
      // Storage restrictions or unavailable analytics must never block navigation.
    }
  };
  return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
}
