'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/lib/animation';
import { Target, Gamepad2 } from 'lucide-react';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';

const contactSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(100),
  email: z.email('Email inválido').max(200),
  phone: z.string().max(30).optional(),
  type: z.enum(['brand', 'talent', 'other'], { error: 'Tipo requerido' }),
  company: z.string().max(100).optional(),
  message: z.string().min(10, 'Mensaje demasiado corto').max(5000),
  // Brand-specific
  budget: z.string().max(20).optional(),
  timeline: z.string().max(30).optional(),
  audience: z.string().max(200).optional(),
  // Creator-specific
  platform: z.string().max(30).optional(),
  viewers: z.string().max(100).optional(),
  monetization: z.string().max(200).optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

const TYPES = [
  { value: 'brand', label: 'Soy una marca / anunciante' },
  { value: 'talent', label: 'Soy un creador de contenido' },
  { value: 'other', label: 'Otro' },
];

const BUDGET_RANGES = [
  { value: '<5k', label: 'Menos de 5.000 €' },
  { value: '5k-15k', label: '5.000 € — 15.000 €' },
  { value: '15k-50k', label: '15.000 € — 50.000 €' },
  { value: '50k+', label: 'Más de 50.000 €' },
];

const TIMELINE_OPTIONS = [
  { value: 'urgent', label: 'Lo antes posible (< 2 semanas)' },
  { value: '1month', label: '1 mes' },
  { value: '2-3months', label: '2-3 meses' },
  { value: 'flexible', label: 'Flexible / sin fecha' },
];

const PLATFORM_OPTIONS = [
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'cs2', label: 'CS2' },
  { value: 'other', label: 'Otra' },
];

const INFO_CARDS = [
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

const inputClasses =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-sp-orange transition-colors';
const selectClasses =
  'w-full rounded-xl border border-white/10 bg-sp-black px-4 py-3 text-sm text-white outline-none focus:border-sp-orange transition-colors';
const labelClasses = 'block text-xs font-semibold text-sp-muted2 mb-1.5 uppercase tracking-widest';

export function ContactSection(): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  const selectedType = watch('type');

  const onSubmit = async (data: ContactForm) => {
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Server error');
      setStatus('ok');
      reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contacto" className="py-24 bg-sp-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <SectionTag>Trabajemos juntos</SectionTag>
            <SectionHeading className="text-white">
              Hablemos <GradientText>Hoy</GradientText>
            </SectionHeading>
          </div>
        </FadeInOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
          {/* Left — info cards */}
          <FadeInOnScroll delay={0.1}>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sp-orange flex-shrink-0">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  marketing@socialpro.es
                </a>
              </div>
            </div>
          </FadeInOnScroll>

          {/* Right — form */}
          <FadeInOnScroll delay={0.2}>
            <div>
              <AnimatePresence mode="wait">
              {status === 'ok' ? (
                <m.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: DURATION.base, ease: EASE.out }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 className="font-bold text-white mb-2">¡Mensaje enviado!</h3>
                  <p className="text-sm text-sp-muted2">Te respondemos en menos de 24h.</p>
                </m.div>
              ) : (
                <m.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE.out }}
                >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Nombre *</label>
                      <input
                        {...register('name')}
                        placeholder="Tu nombre"
                        className={inputClasses}
                      />
                      {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className={labelClasses}>Email *</label>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="tu@email.com"
                        className={inputClasses}
                      />
                      {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <div>
                      <label className={labelClasses}>SOY… *</label>
                      <select {...register('type')} className={selectClasses}>
                        <option value="" className="bg-sp-black">Selecciona...</option>
                        {TYPES.map((t) => (
                          <option key={t.value} value={t.value} className="bg-sp-black">
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Empresa / Canal</label>
                    <input
                      {...register('company')}
                      placeholder="Nombre de tu empresa o canal"
                      className={inputClasses}
                    />
                  </div>

                  {/* Brand-specific fields */}
                  <AnimatePresence initial={false}>
                    {selectedType === 'brand' && (
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
                              <label className={labelClasses}>Presupuesto estimado</label>
                              <select {...register('budget')} className={selectClasses}>
                                <option value="" className="bg-sp-black">Selecciona rango...</option>
                                {BUDGET_RANGES.map((b) => (
                                  <option key={b.value} value={b.value} className="bg-sp-black">
                                    {b.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClasses}>Plazo / Timeline</label>
                              <select {...register('timeline')} className={selectClasses}>
                                <option value="" className="bg-sp-black">Selecciona plazo...</option>
                                {TIMELINE_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value} className="bg-sp-black">
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>Público objetivo</label>
                            <input
                              {...register('audience')}
                              placeholder="Ej: Jugadores de slots 25-40 España"
                              className={inputClasses}
                            />
                          </div>
                        </fieldset>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Creator-specific fields */}
                  <AnimatePresence initial={false}>
                    {selectedType === 'talent' && (
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
                              <label className={labelClasses}>Plataforma principal</label>
                              <select {...register('platform')} className={selectClasses}>
                                <option value="" className="bg-sp-black">Selecciona...</option>
                                {PLATFORM_OPTIONS.map((p) => (
                                  <option key={p.value} value={p.value} className="bg-sp-black">
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClasses}>Viewers / Suscriptores</label>
                              <input
                                {...register('viewers')}
                                placeholder="Ej: 500 viewers avg / 50K subs"
                                className={inputClasses}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>Estado de monetización</label>
                            <input
                              {...register('monetization')}
                              placeholder="Ej: Partner Twitch, sponsors activos, etc."
                              className={inputClasses}
                            />
                          </div>
                        </fieldset>
                      </m.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className={labelClasses}>Mensaje *</label>
                    <textarea
                      {...register('message')}
                      rows={4}
                      placeholder="Cuéntanos qué tienes en mente..."
                      className={`${inputClasses} resize-none`}
                    />
                    {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message.message}</p>}
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-400 text-center">Error al enviar. Inténtalo de nuevo.</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-3.5 rounded-full font-bold text-white text-sm disabled:opacity-60 focus:outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] bg-sp-grad"
                  >
                    {status === 'sending' ? 'Enviando...' : 'Enviar mensaje →'}
                  </button>
                </form>
                </m.div>
              )}
              </AnimatePresence>
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </section>
  );
}
