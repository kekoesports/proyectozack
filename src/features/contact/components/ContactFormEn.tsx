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
  type ContactForm,
} from './ContactSection.parts';

const TYPES_EN = [
  { value: 'brand',  label: "I'm a brand" },
  { value: 'talent', label: "I'm a content creator" },
  { value: 'other',  label: 'Other / general enquiry' },
] as const;

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
 * Contact form en inglés. Reusa el mismo schema Zod y endpoint tRPC
 * `contact.submit` que la versión española.
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
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema), ...(defaultValues ? { defaultValues } : {}) });

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
