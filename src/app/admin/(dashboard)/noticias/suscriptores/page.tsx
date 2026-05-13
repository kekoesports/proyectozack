import { requirePermission } from '@/lib/permissions';
import { listNewsletterSubscribers, getNewsletterStats } from '@/lib/queries/newsletterSubscribers';
import { NewsletterAdminView } from './NewsletterAdminView';

export const metadata = { title: 'Suscriptores Newsletter | Admin' };

export default async function NewsletterSubscribersPage() {
  await requirePermission('noticias', 'read');

  const [subscribers, stats] = await Promise.all([
    listNewsletterSubscribers(),
    getNewsletterStats(),
  ]);

  return <NewsletterAdminView subscribers={subscribers} stats={stats} />;
}
