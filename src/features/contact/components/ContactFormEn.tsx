'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { trpc } from '@/lib/trpc/client';
import {
  contactSchema,
  inputClasses,
  selectClasses,
  labelClasses,
  VERTICAL_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS,
  PLATFORM_OPTIONS,
  type ContactForm,
} from './ContactSection.parts';

const TYPES_EN = [
  { value: 'brand',  label: "I'm a brand / advertiser" },
  { value: 'talent', label: "I'm a content creator" },
  { value: 'other',  label: 'Other / general enquiry' },
] as const;

const BUDGET_RANGES_EN = [
  { value: '<5k',    label: 'Under €5,000' },
  { value: '5k-15k', label: '€5,000 — €15,000' },
  { value: '15k-50k',label: '€15,000 — €50,000' },
  { value: '50k+',   label: 'Over €50,000' },
];

const TIMELINE_OPTIONS_EN = [
  { value: 'urgent',     label: 'ASAP (< 2 weeks)' },
  { value: '1month',     label: '1 month' },
  { value: '2-3months',  label: '2–3 months' },
  { value: 'flexible',   label: 'Flexible / no deadline' },
];

const INFO_CARDS = [
  {
    title: 'Reply within 24 hours',
    desc: 'No bots, no auto-responders. A real person reads every enquiry and follows up the same business day.',
  },
  {
    title: 'No commitment',
    desc: 'Tell us your goals and budget. We send a tailored proposal — no minimums, no hidden fees, no pressure.',
  },
  {
    title: 'Our process is transparent',
    desc: 'After you submit, we assign a point of contact, confirm receipt within a few hours, and come back within 24h with clear next steps — never a generic pitch deck.',
  },
];

/**
 * Contact form in English. Shares the same Zod schema and tRPC endpoint
 * as the Spanish version, with EN-specific labels and conditional brand/talent
 * fields matching the ES form parity.
 *
 * @kind client
 * @feature contact
 * @route /contact
 */
export function ContactFormEn({ defaultValues }: { readonly defaultValues?: Partial<ContactForm> }): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const submitMutation = trpc.contact.submit.useMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema), ...(defaultValues ? { defaultValues } : {}) });

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() no es memoizable, es el comportamiento esperado
  const selectedType = watch('type');

  const onSubmit = async (data: ContactForm) => {
    setStatus('sending');
    try {
      await submitMutation.mutateAsync(data);
      setStatus('ok');
      reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="py-20 bg-sp-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
          {/* Info cards */}
          <div className="space-y-4">
            {INFO_CARDS.map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/10 p-6">
                <h3 className="font-display text-lg font-black uppercase mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="font-display text-lg font-black uppercase mb-2">Other channels</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>Email: <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">marketing@socialpro.es</a></li>
                <li>WhatsApp: <a href="https://wa.me/34604868426" target="_blank" rel="noopener noreferrer" className="text-sp-orange hover:underline">+34 604 868 426</a></li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div>
            {status === 'ok' ? (
              <div className="rounded-2xl border border-white/10 p-8 text-center">
                <h3 className="font-display text-2xl font-black uppercase mb-3">Thanks — message received</h3>
                <p className="text-white/60 leading-relaxed">
                  We&apos;ll get back to you within 24 hours with next steps. In the meantime, you can email us directly at{' '}
                  <a href="mailto:marketing@socialpro.es" className="text-sp-orange hover:underline">marketing@socialpro.es</a>.
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-en-name" className={labelClasses}>Name *</label>
                    <input
                      {...register('name')}
                      id="contact-en-name"
                      placeholder="Your name"
                      className={inputClasses}
                    />
                    {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-en-email" className={labelClasses}>Email *</label>
                    <input
                      {...register('email')}
                      id="contact-en-email"
                      type="email"
                      placeholder="you@email.com"
                      className={inputClasses}
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-en-type" className={labelClasses}>I am… *</label>
                  <select {...register('type')} id="contact-en-type" className={selectClasses}>
                    <option value="" className="bg-sp-black">Select...</option>
                    {TYPES_EN.map((t) => (
                      <option key={t.value} value={t.value} className="bg-sp-black">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>}
                </div>

                <div>
                  <label htmlFor="contact-en-company" className={labelClasses}>Company / Channel</label>
                  <input
                    {...register('company')}
                    id="contact-en-company"
                    placeholder="Your company or channel"
                    className={inputClasses}
                  />
                </div>

                {/* Brand-specific fields */}
                {selectedType === 'brand' && (
                  <fieldset className="space-y-4 border-0 p-0 m-0">
                    <legend className={labelClasses}>Campaign details</legend>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-en-budget" className={labelClasses}>Estimated budget</label>
                        <select {...register('budget')} id="contact-en-budget" className={selectClasses}>
                          <option value="" className="bg-sp-black">Select range...</option>
                          {BUDGET_RANGES_EN.map((b) => (
                            <option key={b.value} value={b.value} className="bg-sp-black">{b.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="contact-en-timeline" className={labelClasses}>Timeline</label>
                        <select {...register('timeline')} id="contact-en-timeline" className={selectClasses}>
                          <option value="" className="bg-sp-black">Select timeline...</option>
                          {TIMELINE_OPTIONS_EN.map((t) => (
                            <option key={t.value} value={t.value} className="bg-sp-black">{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-en-vertical" className={labelClasses}>Vertical</label>
                        <select {...register('vertical')} id="contact-en-vertical" className={selectClasses}>
                          <option value="" className="bg-sp-black">Select vertical...</option>
                          {VERTICAL_OPTIONS.map((v) => (
                            <option key={v.value} value={v.value} className="bg-sp-black">{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="contact-en-campaign-type" className={labelClasses}>Campaign type</label>
                        <select {...register('campaignType')} id="contact-en-campaign-type" className={selectClasses}>
                          <option value="" className="bg-sp-black">Select type...</option>
                          {CAMPAIGN_TYPE_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value} className="bg-sp-black">{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contact-en-audience" className={labelClasses}>Target audience</label>
                      <input
                        {...register('audience')}
                        id="contact-en-audience"
                        placeholder="e.g. Slots players 25–40, Spain"
                        className={inputClasses}
                      />
                    </div>
                  </fieldset>
                )}

                {/* Talent-specific fields */}
                {selectedType === 'talent' && (
                  <fieldset className="space-y-4 border-0 p-0 m-0">
                    <legend className={labelClasses}>Your channel</legend>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-en-platform" className={labelClasses}>Main platform</label>
                        <select {...register('platform')} id="contact-en-platform" className={selectClasses}>
                          <option value="" className="bg-sp-black">Select...</option>
                          {PLATFORM_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value} className="bg-sp-black">{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="contact-en-viewers" className={labelClasses}>Viewers / Subscribers</label>
                        <input
                          {...register('viewers')}
                          id="contact-en-viewers"
                          placeholder="e.g. 500 avg viewers / 50K subs"
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="contact-en-monetization" className={labelClasses}>Monetisation status</label>
                      <input
                        {...register('monetization')}
                        id="contact-en-monetization"
                        placeholder="e.g. Twitch Partner, active sponsors, etc."
                        className={inputClasses}
                      />
                    </div>
                  </fieldset>
                )}

                <div>
                  <label htmlFor="contact-en-message" className={labelClasses}>Message *</label>
                  <textarea
                    {...register('message')}
                    id="contact-en-message"
                    rows={5}
                    placeholder="Tell us what you have in mind..."
                    className={`${inputClasses} resize-none`}
                  />
                  {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message.message}</p>}
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-400 text-center">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3.5 rounded-full font-bold text-white text-sm disabled:opacity-60 focus:outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] bg-sp-grad"
                >
                  {status === 'sending' ? 'Sending...' : 'Send message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
