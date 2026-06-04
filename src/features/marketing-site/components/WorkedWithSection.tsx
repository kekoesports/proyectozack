import Image from 'next/image';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { gradientStyle } from '@/lib/utils/gradient';

type Platform = 'twitch' | 'youtube' | 'instagram' | 'tiktok' | 'kick' | 'twitter';

type Creator = {
  handle: string;
  platform: Platform;
  photoUrl?: string;
  gradientC1?: string;
  gradientC2?: string;
};

const CREATORS: Creator[] = [
  { handle: 'imantado',    platform: 'twitch',  gradientC1: '#6441a5', gradientC2: '#2a0e61' },
  { handle: 'andreachini', platform: 'twitch',  gradientC1: '#f5632a', gradientC2: '#8b3aad' },
  { handle: 'therealfer',  platform: 'youtube', gradientC1: '#e03070', gradientC2: '#c42880' },
];

export function WorkedWithSection() {
  return (
    <section className="bg-sp-off py-12 px-4 sm:px-6 border-t border-sp-border">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-sp-dark mb-8">
          Talentos con los que hemos trabajado
        </h2>
        <div className="flex flex-wrap gap-4">
          {CREATORS.map((c) => {
            const grad = gradientStyle(c.gradientC1 ?? '#f5632a', c.gradientC2 ?? '#8b3aad');
            const initial = (c.handle[0] ?? '?').toUpperCase();
            return (
              <div
                key={c.handle}
                className="flex items-center gap-3 bg-white border border-sp-border rounded-xl px-4 py-3 shadow-sm"
              >
                <div
                  className="relative w-10 h-10 rounded-full overflow-hidden shrink-0"
                  style={{ background: grad }}
                >
                  {c.photoUrl ? (
                    <Image
                      src={c.photoUrl}
                      alt={c.handle}
                      fill
                      sizes="40px"
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-base font-black text-white/80">
                        {initial}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-black uppercase tracking-tight text-sp-dark leading-none">
                    @{c.handle}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <SocialIcon type={c.platform} size={10} />
                    <span className="text-[10px] text-sp-muted capitalize">{c.platform}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
