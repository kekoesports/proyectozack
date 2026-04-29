'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as m from 'motion/react-client';
import type { TalentWithRelations } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { gradientStyle } from '@/lib/gradient';
import { DURATION, EASE } from '@/lib/animation';

type TalentModalProps = {
  readonly talent: TalentWithRelations;
  readonly onClose: () => void;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function TalentModal({ talent, onClose }: TalentModalProps): React.JSX.Element {
  const onCloseRef = useRef(onClose);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus first focusable element on open
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);

  return (
    <m.div
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
    >
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="talent-modal-name"
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: DURATION.fast, ease: EASE.out }}
      >
        {/* Header image */}
        <header className="relative h-56" style={{ background: grad }}>
          {talent.photoUrl && (
            <Image
              src={talent.photoUrl}
              alt={talent.name}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="object-cover object-top"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <div>
              <h2 id="talent-modal-name" className="font-display text-3xl font-black uppercase text-white leading-none">
                {talent.name}
              </h2>
              <p className="text-white/80 text-sm">{talent.role}</p>
            </div>
            <StatusBadge status={talent.status} className="mb-0.5" />
          </div>
        </header>

        {/* Content */}
        <section className="p-6 space-y-5">
          {/* Bio */}
          <p className="text-sp-muted text-sm leading-relaxed">{talent.bio}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {talent.stats.map((stat) => (
              <div
                key={stat.id}
                className="rounded-xl border border-sp-border bg-sp-off p-3 text-center"
              >
                <div className="text-lg font-bold text-sp-dark">{stat.value}</div>
                <div className="text-xs text-sp-muted leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {talent.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-3 py-1 rounded-full bg-sp-bg2 text-sp-muted font-medium"
              >
                {t.tag}
              </span>
            ))}
          </div>

          {/* Socials */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-sp-muted">Redes sociales</h3>
            {talent.socials.map((s) => (
              <a
                key={s.id}
                href={s.profileUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-sp-off px-4 py-3 hover:bg-sp-bg2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${s.hexColor}20` }}
                  >
                    <SocialIcon type={s.platform} color={s.hexColor} size={16} />
                  </div>
                  <span className="text-sm font-semibold text-sp-dark">{s.handle}</span>
                </div>
                <span className="text-sm font-bold text-sp-dark">{s.followersDisplay}</span>
              </a>
            ))}
          </div>

          {/* Profile link */}
          <Link
            href={`/talentos/${talent.slug}`}
            onClick={onClose}
            className="block text-center w-full py-3.5 rounded-full font-bold text-sm border-2 border-sp-border text-sp-dark hover:bg-sp-off transition-colors"
          >
            Ver perfil completo &rarr;
          </Link>

          {/* CTA */}
          <Link
            href="/contacto"
            onClick={onClose}
            className="block text-center w-full py-3.5 rounded-full font-bold text-white text-sm"
            style={{ background: grad }}
          >
            Contactar para colaboración
          </Link>
        </section>
      </m.div>
    </m.div>
  );
}
