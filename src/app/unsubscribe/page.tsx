import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { UnsubscribeClient } from './UnsubscribeClient';

export const metadata: Metadata = {
  title: 'Darse de baja — SocialPro News',
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  let email: string | undefined;
  let alreadyUnsubscribed = false;
  let invalidToken = false;

  if (!token || token.length > 64 || !/^[0-9a-f]+$/.test(token)) {
    invalidToken = true;
  } else {
    const [row] = await db
      .select({ email: newsletterSubscribers.email, status: newsletterSubscribers.status })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.unsubscribeToken, token))
      .limit(1);

    if (!row) {
      // Always render same page — don't leak token validity via 404
      invalidToken = true;
    } else if (row.status === 'unsubscribed') {
      email = row.email;
      alreadyUnsubscribed = true;
    } else {
      email = row.email;
    }
  }

  return (
    <UnsubscribeClient
      token={token ?? ''}
      email={email}
      alreadyUnsubscribed={alreadyUnsubscribed}
      invalidToken={invalidToken}
    />
  );
}
