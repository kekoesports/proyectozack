'use client';

import Link from 'next/link';
import * as m from 'motion/react-client';
import { Target, Gamepad2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { contactBodySchema, type ContactBody } from '@/lib/schemas/contact';

export const contactSchema = contactBodySchema;
export type ContactForm = ContactBody;

export const TYPES = [
  { value: 'brand', label: 'Soy una marca / anunciante' },
  { value: 'talent', label: 'Soy un creador de contenido' },
  { value: 'other', label: 'Otro' },
];

export const BUDGET_RANGES = [
  { value: '<5k', label: 'Menos de 5.000 €' },
  { value: '5k-15k', label: '5.000 € — 15.000 €' },
  { value: '15k-50k', label: '15.000 € — 50.000 €' },
  { value: '50k+', label: 'Más de 50.000 €' },
];

export const TIMELINE_OPTIONS = [
  { value: 'urgent', label: 'Lo antes posible (< 2 semanas)' },
  { value: '1month', label: '1 mes' },
  { value: '2-3months', label: '2-3 meses' },
  { value: 'flexible', label: 'Flexible / sin fecha' },
];

export const VERTICAL_OPTIONS = [
  { value: 'igaming', label: 'iGaming (general)' },
  { value: 'cs2_skins', label: 'CS2 Skins' },
  { value: 'betting', label: 'Apuestas / Betting' },
  { value: 'casino', label: 'Casino' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'esports', label: 'Esports' },
  { value: 'hardware', label: 'Hardware / Periféricos' },
  { value: 'other', label: 'Otro' },
];

export const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'sponsored_stream', label: 'Stream patrocinado' },
  { value: 'dedicated_video', label: 'Vídeo dedicado' },
  { value: 'social_posts', label: 'Posts en redes sociales' },
  { value: 'event_sponsorship', label: 'Patrocinio de evento / torneo' },
  { value: 'brand_ambassador', label: 'Brand ambassador' },
  { value: 'giveaway', label: 'Sorteo / Giveaway' },
  { value: 'product_review', label: 'Reseña de producto' },
  { value: 'other', label: 'Otro / A definir' },
];

export const PLATFORM_OPTIONS = [
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'otra', label: 'Otra' },
];

export const INFO_CARDS = [
  {
    Icon: Target,
    title: 'Para marcas',
    desc: 'Lanza campañas con los mejores creadores gaming. Selección, ejecución y resultados medibles.',
  },
  {
    Icon: Gamepad2,
    title: 'Para creadores',
    desc: 'Accede a colaboraciones premium, gestión de canal y desarrollo de marca personal.',
  },
];

export const inputClasses =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-sp-orange transition-colors';
export const selectClasses =
  'w-full rounded-xl border border-white/10 bg-sp-black px-4 py-3 text-sm text-white outline-none focus:border-sp-orange transition-colors';
export const labelClasses = 'block text-xs font-semibold text-sp-muted2 mb-1.5 uppercase tracking-widest';

type FieldsProps = {
  readonly register: UseFormRegister<ContactForm>;
  readonly errors: FieldErrors<ContactForm>;
  readonly selectedPlatform?: ContactForm['platform'];
};

export function BrandFields({ register }: FieldsProps): React.JSX.Element {
  return (
    <m.div
      key="brand-fields"
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden [transform-origin:top]"
    >
      <fieldset className="space-y-4 border-0 p-0 m-0">
        <legend className={labelClasses}>Datos de campaña</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-budget" className={labelClasses}>Presupuesto estimado</label>
            <select {...register('budget')} id="contact-budget" className={selectClasses}>
              <option value="" className="bg-sp-black">Selecciona rango...</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b.value} value={b.value} className="bg-sp-black">
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="contact-timeline" className={labelClasses}>Plazo / Timeline</label>
            <select {...register('timeline')} id="contact-timeline" className={selectClasses}>
              <option value="" className="bg-sp-black">Selecciona plazo...</option>
              {TIMELINE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value} className="bg-sp-black">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-vertical" className={labelClasses}>Vertical</label>
            <select {...register('vertical')} id="contact-vertical" className={selectClasses}>
              <option value="" className="bg-sp-black">Selecciona vertical...</option>
              {VERTICAL_OPTIONS.map((v) => (
                <option key={v.value} value={v.value} className="bg-sp-black">
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="contact-campaign-type" className={labelClasses}>Tipo de campaña</label>
            <select {...register('campaignType')} id="contact-campaign-type" className={selectClasses}>
              <option value="" className="bg-sp-black">Selecciona tipo...</option>
              {CAMPAIGN_TYPE_OPTIONS.map((c) => (
                <option key={c.value} value={c.value} className="bg-sp-black">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="contact-audience" className={labelClasses}>Público objetivo</label>
          <input
            {...register('audience')}
            id="contact-audience"
            placeholder="Ej: Jugadores de slots 25-40 España"
            className={inputClasses}
          />
        </div>
      </fieldset>
    </m.div>
  );
}

export function TalentFields({ register, errors, selectedPlatform }: FieldsProps): React.JSX.Element {
  const audienceCopy = selectedPlatform === 'youtube'
    ? {
        label: 'Visualizaciones medias en vídeos largos',
        placeholder: 'Ej. 15K visualizaciones',
        help: 'Usa tus vídeos largos recientes; no cuentes Shorts.',
      }
    : selectedPlatform === 'twitch' || selectedPlatform === 'kick'
      ? {
          label: 'Espectadores medios en directo (30 días)',
          placeholder: 'Ej. 120 espectadores',
          help: 'Indica la media aproximada de los últimos 30 días.',
        }
      : {
          label: 'Visualizaciones medias recientes',
          placeholder: 'Ej. 15K visualizaciones',
          help: 'Una cifra aproximada es suficiente.',
        };

  return (
    <m.div
      key="talent-fields"
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      exit={{ scaleY: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden [transform-origin:top]"
    >
      <fieldset className="space-y-4 border-0 p-0 m-0">
        <legend className={labelClasses}>Tu canal</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-country" className={labelClasses}>País *</label>
            <input
              {...register('country')}
              id="contact-country"
              list="contact-countries"
              autoComplete="country-name"
              placeholder="Ej. España"
              className={inputClasses}
            />
            <datalist id="contact-countries">
              <option value="España" />
              <option value="México" />
              <option value="Argentina" />
              <option value="Chile" />
              <option value="Colombia" />
              <option value="Perú" />
            </datalist>
            {errors.country && <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>}
          </div>
          <div>
            <label htmlFor="contact-platform" className={labelClasses}>Plataforma principal *</label>
            <select {...register('platform')} id="contact-platform" className={selectClasses}>
              <option value="" className="bg-sp-black">Selecciona...</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="bg-sp-black">
                  {p.label}
                </option>
              ))}
            </select>
            {errors.platform && <p className="text-xs text-red-400 mt-1">{errors.platform.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="contact-channel-url" className={labelClasses}>Enlace al canal principal *</label>
          <input
            {...register('channelUrl')}
            id="contact-channel-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://youtube.com/@tucanal"
            className={inputClasses}
          />
          {errors.channelUrl && <p className="text-xs text-red-400 mt-1">{errors.channelUrl.message}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-content" className={labelClasses}>Juego o contenido principal *</label>
            <input
              {...register('contentCategory')}
              id="contact-content"
              placeholder="Ej. Counter-Strike 2"
              className={inputClasses}
            />
            {errors.contentCategory && <p className="text-xs text-red-400 mt-1">{errors.contentCategory.message}</p>}
          </div>
          <div>
            <label htmlFor="contact-followers" className={labelClasses}>Seguidores / suscriptores</label>
            <input
              {...register('followers')}
              id="contact-followers"
              inputMode="numeric"
              placeholder="Ej. 50K"
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-average-audience" className={labelClasses}>{audienceCopy.label}</label>
          <input
            {...register('averageAudience')}
            id="contact-average-audience"
            placeholder={audienceCopy.placeholder}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-sp-muted2">{audienceCopy.help}</p>
        </div>
        <div>
          <label htmlFor="contact-other-links" className={labelClasses}>Otras redes</label>
          <textarea
            {...register('otherLinks')}
            id="contact-other-links"
            rows={2}
            placeholder={'Un enlace por línea\nhttps://twitch.tv/tucanal'}
            className={`${inputClasses} resize-none`}
          />
        </div>
      </fieldset>
    </m.div>
  );
}

export function InfoCards(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {INFO_CARDS.map(({ Icon, title, desc }) => (
        <div
          key={title}
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="mb-3">
            <Icon size={22} className="text-sp-orange" />
          </div>
          <h3 className="font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-sp-muted2 leading-relaxed">{desc}</p>
        </div>
      ))}

      {/* Contacto directo */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-bold text-white mb-1">Respuesta garantizada en 24h</h3>
        <p className="text-sm text-sp-muted2 mb-4 leading-relaxed">
          Nuestro equipo revisa cada solicitud personalmente. También puedes escribirnos directamente por WhatsApp usando el botón que aparece en la esquina inferior derecha.
        </p>
        <a
          href="mailto:marketing@socialpro.es"
          className="flex items-center gap-3 w-full px-5 py-3.5 rounded-xl font-semibold text-white text-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sp-orange flex-shrink-0" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          marketing@socialpro.es
        </a>
      </div>
    </div>
  );
}

export function SuccessMessage(): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3 className="font-bold text-white mb-2">¡Mensaje enviado!</h3>
      <p className="text-sm text-sp-muted2 mb-5">
        Te respondemos en menos de 24h. Mientras tanto, explora nuestros talentos.
      </p>
      <Link
        href="/talentos"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
      >
        Ver talentos →
      </Link>
    </div>
  );
}
