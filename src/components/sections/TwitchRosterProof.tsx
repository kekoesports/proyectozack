import Image from 'next/image';
import Link from 'next/link';
import { getTalents } from '@/lib/queries/talents';
import { getCaseBySlug } from '@/lib/queries/cases';
import { normalizePlatform } from '@/lib/utils/platform';

/** Public server rendering: no CRM records are serialized to a client component. */
export async function TwitchRosterProof() {
  const [roster, razer] = await Promise.all([getTalents(), getCaseBySlug('razer')]);
  const creators = roster.filter((talent) =>
    talent.status !== 'inactive' && talent.photoUrl &&
    talent.socials.some((social) => normalizePlatform(social.platform) === 'twitch' && social.profileUrl),
  ).slice(0, 6);

  if (creators.length === 0 && !razer?.isPublished) return null;

  return (
    <section className="bg-sp-off py-16 md:py-20" aria-labelledby="twitch-roster-title">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Who we work with</p>
        <h2 id="twitch-roster-title" className="font-display text-3xl font-black uppercase text-sp-dark mb-4">Meet creators from our roster</h2>
        <p className="text-sp-muted max-w-2xl mb-8">Explore their profiles and channels. We confirm audience fit, current availability and deliverables for each brief before proposing a collaboration.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {creators.map((talent) => (
            <Link key={talent.id} href={`/talentos/${talent.slug}`} className="group overflow-hidden rounded-2xl border border-sp-border bg-white focus-visible:outline-2 focus-visible:outline-sp-orange">
              <div className="relative aspect-[4/3] bg-sp-bg2 overflow-hidden">
                {talent.photoUrl && <Image src={talent.photoUrl} alt={talent.name} fill sizes="(max-width: 767px) 45vw, 320px" className="object-cover object-top group-hover:scale-105 transition-transform motion-reduce:transition-none" />}
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl font-black uppercase text-sp-dark">{talent.name}</h3>
                <p className="text-sm text-sp-muted mt-1">{talent.game} · Twitch</p>
                <span className="inline-block text-sm font-semibold text-sp-orange mt-3">View creator profile <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          ))}
        </div>
        {razer?.isPublished && (
          <div className="mt-10 rounded-2xl border border-sp-border bg-white p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="bg-sp-black rounded-xl p-6 shrink-0">
              <Image src="/images/brands/razer.png" alt="Razer" width={160} height={64} className="object-contain h-16 w-40" />
            </div>
            <div>
              <p className="text-xs text-sp-orange font-bold uppercase tracking-widest mb-2">A published brand collaboration</p>
              <h3 className="font-display text-2xl font-black uppercase text-sp-dark">Razer × SocialPro</h3>
              <p className="text-sm text-sp-muted my-3">See our gaming creator activation, the work delivered and the participants documented in the case study.</p>
              <Link href={`/casos/${razer.slug}`} className="text-sm font-semibold text-sp-orange hover:underline">Read the case study (Spanish) →</Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
