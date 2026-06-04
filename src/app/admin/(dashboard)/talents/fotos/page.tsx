import Link from 'next/link';
import { sql, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, creatorCodes, giveaways } from '@/db/schema';
import { TalentPhotoCard } from '@/features/admin/talents/components/TalentPhotoCard';

export const metadata = { title: 'Fotos talents · Admin' };
export const dynamic = 'force-dynamic';

type Row = {
  id: number;
  slug: string;
  name: string;
  initials: string;
  gradientC1: string;
  gradientC2: string;
  photoUrl: string | null;
  visibility: 'public' | 'internal';
  codeCount: number;
  giveawayCount: number;
};

async function loadTalents(): Promise<Row[]> {
  const codeCountSubquery = db
    .select({
      talentId: creatorCodes.talentId,
      count: sql<number>`count(*)::int`.as('code_count'),
    })
    .from(creatorCodes)
    .groupBy(creatorCodes.talentId)
    .as('codeCounts');

  const giveawayCountSubquery = db
    .select({
      talentId: giveaways.talentId,
      count: sql<number>`count(*)::int`.as('giveaway_count'),
    })
    .from(giveaways)
    .groupBy(giveaways.talentId)
    .as('giveawayCounts');

  const rows = await db
    .select({
      id: talents.id,
      slug: talents.slug,
      name: talents.name,
      initials: talents.initials,
      gradientC1: talents.gradientC1,
      gradientC2: talents.gradientC2,
      photoUrl: talents.photoUrl,
      visibility: talents.visibility,
      codeCount: sql<number>`coalesce(${codeCountSubquery.count}, 0)::int`,
      giveawayCount: sql<number>`coalesce(${giveawayCountSubquery.count}, 0)::int`,
    })
    .from(talents)
    .leftJoin(codeCountSubquery, sql`${codeCountSubquery.talentId} = ${talents.id}`)
    .leftJoin(giveawayCountSubquery, sql`${giveawayCountSubquery.talentId} = ${talents.id}`)
    .orderBy(asc(talents.sortOrder), asc(talents.name));

  return rows as Row[];
}

export default async function TalentsPhotosPage(): Promise<React.ReactElement> {
  const all = await loadTalents();

  // Categorise: in giveaways/codes & no photo, in giveaways/codes & photo, others
  const inHubMissing: Row[] = [];
  const inHubWithPhoto: Row[] = [];
  const others: Row[] = [];

  for (const t of all) {
    const inHub = t.codeCount > 0 || t.giveawayCount > 0;
    if (inHub && !t.photoUrl) inHubMissing.push(t);
    else if (inHub) inHubWithPhoto.push(t);
    else others.push(t);
  }

  const totals = {
    all: all.length,
    inHub: inHubMissing.length + inHubWithPhoto.length,
    missing: inHubMissing.length,
    withPhoto: inHubWithPhoto.length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">
            Fotos de talents
          </h1>
          <p className="text-sm text-sp-admin-muted mt-1">
            Sube o reemplaza la foto de cada creador. Se reflejan al instante en{' '}
            <Link href="/codigos" className="underline hover:text-sp-admin-text">/codigos</Link>
            {' '}y en su página pública.
          </p>
        </div>
        <Link
          href="/admin/talents"
          className="text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text border border-sp-admin-border rounded-xl px-3 py-2"
        >
          ← Volver al roster
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total talents" value={totals.all} tone="neutral" />
        <Stat label="En hub (codes/sorteos)" value={totals.inHub} tone="neutral" />
        <Stat label="Sin foto en hub" value={totals.missing} tone={totals.missing > 0 ? 'warn' : 'ok'} />
        <Stat label="Con foto en hub" value={totals.withPhoto} tone="ok" />
      </div>

      {/* Section: missing photos in hub (priority) */}
      {inHubMissing.length > 0 && (
        <Section
          title="Sin foto · aparecen en /giveaways"
          subtitle="Estos creadores se ven en la sidebar del hub solo con iniciales. Súbeles foto."
          tone="warn"
        >
          <CardGrid rows={inHubMissing} />
        </Section>
      )}

      {/* Section: with photos in hub */}
      {inHubWithPhoto.length > 0 && (
        <Section
          title="Con foto · en /giveaways"
          subtitle="Reemplaza la foto si quieres actualizar."
        >
          <CardGrid rows={inHubWithPhoto} />
        </Section>
      )}

      {/* Section: rest of roster */}
      {others.length > 0 && (
        <Section
          title="Resto del roster"
          subtitle="Talents sin códigos ni sorteos activos."
        >
          <CardGrid rows={others} />
        </Section>
      )}

      <div className="mt-8 rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5 text-sm text-sp-admin-muted">
        <p className="font-semibold text-sp-admin-text mb-1">Notas</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Formatos: JPG, PNG, WebP, GIF · máx 5 MB</li>
          <li>Recomendado: 400×400 px (cuadrada). Se recorta con object-cover.</li>
          <li>Las fotos se suben a Vercel Blob y se sirven optimizadas.</li>
          <li>Si borras la foto, el sidebar mostrará iniciales con el gradiente del talent.</li>
        </ul>
      </div>
    </div>
  );
}

function CardGrid({ rows }: { rows: readonly Row[] }): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((t) => (
        <TalentPhotoCard
          key={t.id}
          talent={{
            id: t.id,
            slug: t.slug,
            name: t.name,
            initials: t.initials,
            gradientC1: t.gradientC1,
            gradientC2: t.gradientC2,
            photoUrl: t.photoUrl,
            visibility: t.visibility,
            codeCount: t.codeCount,
            giveawayCount: t.giveawayCount,
          }}
        />
      ))}
    </div>
  );
}

function Section({
  title,
  subtitle,
  tone,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly tone?: 'warn';
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          className={`font-display text-sm font-black uppercase tracking-[0.15em] ${
            tone === 'warn' ? 'text-amber-400' : 'text-sp-admin-text'
          }`}
        >
          {title}
        </h2>
        {subtitle && <p className="text-xs text-sp-admin-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: 'neutral' | 'ok' | 'warn';
}): React.ReactElement {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : tone === 'ok'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        : 'border-sp-admin-border bg-sp-admin-card text-sp-admin-text';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold opacity-70">{label}</p>
      <p className="font-display text-2xl font-black tabular-nums mt-1">{value}</p>
    </div>
  );
}
