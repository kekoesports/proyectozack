import { notFound } from 'next/navigation';
import { getTalentBySlugAdmin } from '@/lib/queries/talents';
import { getTalentSnapshots } from '@/lib/queries/analytics';
import { GrowthReport } from '@/features/admin/analytics/components/GrowthReport';

type ReportPageProps = {
  params: Promise<{ talentSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function GrowthReportPage({ params, searchParams }: ReportPageProps) {
  const { talentSlug } = await params;
  const { from, to } = await searchParams;

  const talent = await getTalentBySlugAdmin(talentSlug);
  if (!talent) return notFound();

  const toDate = to ?? new Date().toISOString().split('T')[0]!;
  const fromDate = from ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0]!;
  })();

  const snapshots = await getTalentSnapshots(talent.id, fromDate, toDate);

  return (
    <div className="print:p-0">
      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
      <GrowthReport
        talentName={talent.name}
        talentPhoto={talent.photoUrl}
        from={fromDate}
        to={toDate}
        snapshots={snapshots}
      />
    </div>
  );
}
