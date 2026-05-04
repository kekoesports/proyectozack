'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as m from 'motion/react-client';
import { AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/lib/utils/animation';
import { SectionTag } from '@/components/ui/SectionTag';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GradientText } from '@/components/ui/GradientText';
import { FadeInOnScroll } from '@/components/ui/FadeInOnScroll';
import { trpc } from '@/lib/trpc/client';
import { trackEvent } from '@/lib/analytics';
import {
  contactSchema,
  TYPES,
  inputClasses,
  selectClasses,
  labelClasses,
  BrandFields,
  TalentFields,
  InfoCards,
  SuccessMessage,
  type ContactForm,
} from './ContactSection.parts';

/**
 * Formulario completo de contacto para marcas y creadores: validación con
 * Zod + react-hook-form, campos condicionales por tipo y POST a
 * `/api/contact`. Embebido en home y página `/contacto`.
 *
 * @kind client
 * @feature contact
 * @route /contacto
 * @example
 * ```tsx
 * <ContactSection />
 * ```
 */
export function ContactSection(): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const submitMutation = trpc.contact.submit.useMutation();

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
      await submitMutation.mutateAsync(data);
      trackEvent('form_submit', { form_id: 'contact', visitor_type: data.type });
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
            <InfoCards />
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
                >
                  <SuccessMessage />
                </m.div>
              ) : (
                <m.div
                  key="form"
                  data-motion-fallback=""
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE.out }}
                >
                <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5">
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
                      <BrandFields register={register} errors={errors} />
                    )}
                  </AnimatePresence>

                  {/* Creator-specific fields */}
                  <AnimatePresence initial={false}>
                    {selectedType === 'talent' && (
                      <TalentFields register={register} errors={errors} />
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
