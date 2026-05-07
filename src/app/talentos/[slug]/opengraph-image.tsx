import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, creatorCodes, giveaways } from '@/db/schema';

// Node.js runtime con Drizzle — mismo patrón que /api/og/talent/[slug]
export const runtime     = 'nodejs';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  let name = slug.toUpperCase().replace(/-/g, ' ');
  let role = '';
  let game = '';
  let initials = name.slice(0, 2);
  let photoSrc: string | null = null;
  let c1 = '#f5632a';
  let c2 = '#8b3aad';
  let codeCount = 0;
  let giveawayCount = 0;

  try {
    const [talentRows, codeRows, giveawayRows] = await Promise.all([
      db.select({
        name: talents.name, role: talents.role, game: talents.game,
        initials: talents.initials, photoUrl: talents.photoUrl,
        gradientC1: talents.gradientC1, gradientC2: talents.gradientC2,
      }).from(talents).where(eq(talents.slug, slug)).limit(1),

      db.select({ id: creatorCodes.id }).from(creatorCodes)
        .innerJoin(talents, eq(talents.id, creatorCodes.talentId))
        .where(eq(talents.slug, slug)),

      db.select({ id: giveaways.id }).from(giveaways)
        .innerJoin(talents, eq(talents.id, giveaways.talentId))
        .where(eq(talents.slug, slug)),
    ]);

    const t = talentRows[0];
    if (t) {
      name       = t.name;
      role       = t.role;
      game       = t.game;
      initials   = t.initials;
      c1         = t.gradientC1;
      c2         = t.gradientC2;
      codeCount  = codeRows.length;
      giveawayCount = giveawayRows.length;
      if (t.photoUrl) {
        photoSrc = t.photoUrl.startsWith('http')
          ? t.photoUrl
          : `https://socialpro.es${t.photoUrl}`;
      }
    }
  } catch { /* render con datos del slug */ }

  const nameSize = name.length > 14 ? 64 : name.length > 10 ? 76 : 90;
  const metaParts: string[] = [];
  if (codeCount > 0) metaParts.push(`${codeCount} ${codeCount === 1 ? 'código activo' : 'códigos activos'}`);
  if (giveawayCount > 0) metaParts.push(`${giveawayCount} sorteo${giveawayCount !== 1 ? 's' : ''} live`);
  const metaLine = metaParts.join(' · ');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
        {/* Left accent */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

        {/* Content row */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 56px 80px' }}>
          {/* Avatar */}
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} width={200} height={200} style={{ borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} alt={name} />
          ) : (
            <div style={{ width: 200, height: 200, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{initials.toUpperCase()}</span>
            </div>
          )}

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ fontSize: 14, color: c1, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>SocialPro · Creador</div>
            <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase' }}>{name}</div>
            {(role || game) && (
              <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                {[role, game].filter(Boolean).join(' · ')}
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

        {/* Footer */}
        <div style={{ padding: '0 72px 28px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/talentos/{slug}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
      </div>
    ),
    { ...size },
  );
}
