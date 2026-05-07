import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

type TalentRow = {
  name: string; role: string; game: string; initials: string;
  photo_url: string | null; gradient_c1: string; gradient_c2: string;
  code_count: number; giveaway_count: number;
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  let talent: TalentRow | null = null;

  try {
    const DATABASE_URL = process.env.DATABASE_URL ?? '';
    if (DATABASE_URL) {
      // Dynamic import para evitar problemas de bundle en edge
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(DATABASE_URL);
      const rows = await sql`
        SELECT t.name, t.role, t.game, t.initials, t.photo_url,
               t.gradient_c1, t.gradient_c2,
               (SELECT COUNT(*) FROM creator_codes cc WHERE cc.talent_id = t.id)::int AS code_count,
               (SELECT COUNT(*) FROM giveaways g WHERE g.talent_id = t.id
                  AND (g.ends_at IS NULL OR g.ends_at > NOW()))::int AS giveaway_count
        FROM talents t WHERE t.slug = ${slug} LIMIT 1
      `;
      if (rows[0]) talent = rows[0] as TalentRow;
    }
  } catch { /* render fallback */ }

  const c1   = talent?.gradient_c1 || '#f5632a';
  const c2   = talent?.gradient_c2 || '#8b3aad';
  const name = talent?.name ?? slug.replace(/-/g, ' ').toUpperCase();
  const nameSize = name.length > 14 ? 64 : name.length > 10 ? 76 : 88;

  const photoSrc = talent?.photo_url
    ? talent.photo_url.startsWith('http')
      ? talent.photo_url
      : `https://socialpro.es${talent.photo_url}`
    : null;

  const metaParts: string[] = [];
  if (talent?.code_count) metaParts.push(`${talent.code_count} ${talent.code_count === 1 ? 'código activo' : 'códigos activos'}`);
  if (talent?.giveaway_count) metaParts.push(`${talent.giveaway_count} sorteo${talent.giveaway_count !== 1 ? 's' : ''} live`);
  const metaLine = metaParts.join(' · ');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 56px 80px' }}>
          {photoSrc ? (
            <img src={photoSrc} width={200} height={200} style={{ borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 200, height: 200, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{(talent?.initials ?? name.slice(0, 2)).toUpperCase()}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ fontSize: 14, color: c1, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>SocialPro · Creador</div>
            <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase' }}>{name}</div>
            {talent && (talent.role || talent.game) && (
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                {[talent.role, talent.game].filter(Boolean).join(' · ')}
              </div>
            )}
            {metaLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#C3FC00' }} />
                <div style={{ fontSize: 18, color: '#C3FC00', fontWeight: 700 }}>{metaLine}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0 72px 28px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/talentos/{slug}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
      </div>
    ),
    { ...size },
  );
}
