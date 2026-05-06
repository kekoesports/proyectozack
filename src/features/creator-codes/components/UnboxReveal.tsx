'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { GiveawayPrizePlaceholder } from '@/features/giveaways/components/GiveawayPrizePlaceholder';

type UnboxRevealProps = {
  imageUrl: string;
  alt: string;
  isFinished: boolean;
}

function makeParticles(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: 10 }, (_, i) => {
    const v = ((h * (i + 1) * 7919) & 0xffffff) / 0xffffff;
    const angle = (i / 10) * Math.PI * 2 + v * 0.5;
    return {
      x: Math.cos(angle) * (50 + v * 60),
      y: Math.sin(angle) * (35 + v * 50),
      size: 2 + v * 4,
      delay: v * 0.1,
    };
  });
}

/**
 * Animación de reveal tipo unboxing del código del creador.
 *
 * @kind client
 * @feature creator-codes
 * @route /[creatorSlug]
 * @example
 * ```tsx
 * <UnboxReveal imageUrl="/box.png" alt="Reward" isFinished={false} />
 * ```
 */
export function UnboxReveal({ imageUrl, alt, isFinished }: UnboxRevealProps) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particles = useMemo(() => makeParticles(alt), [alt]);

  const triggerUnbox = useCallback(() => {
    if (isFinished || playing) return;
    setPlaying(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setPlaying(false), 1100);
  }, [isFinished, playing]);

  return (
    <div
      className="relative aspect-[4/3] bg-gradient-to-b from-transparent to-black/20 overflow-hidden"
      onMouseEnter={triggerUnbox}
    >
      {/* Base skin image — always visible */}
      {imgError ? (
        <GiveawayPrizePlaceholder size="lg" />
      ) : (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-contain p-6 transition-all duration-500 ${isFinished ? '' : 'gw-float'}`}
          onError={() => setImgError(true)}
        />
      )}

      {/* Unbox overlay — plays on hover */}
      <AnimatePresence>
        {playing && (
          <motion.div
            key="unbox-fx"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            {/* Flash behind skin */}
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(195,252,0,0.35)_0%,transparent_55%)]"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 0.6, 0], scale: [0.3, 1.2, 1.5, 2] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />

            {/* Box halves splitting */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-12 h-20 -translate-y-1/2 origin-right rounded-l-lg border-2 border-r-0 border-[#C3FC00]/40 bg-[#C3FC00]/[0.06]"
              initial={{ x: '-100%', opacity: 1, rotateZ: 0 }}
              animate={{ x: '-220%', opacity: 0, rotateZ: -20 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 w-12 h-20 -translate-y-1/2 origin-left rounded-r-lg border-2 border-l-0 border-[#C3FC00]/40 bg-[#C3FC00]/[0.06]"
              initial={{ x: '0%', opacity: 1, rotateZ: 0 }}
              animate={{ x: '120%', opacity: 0, rotateZ: 20 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
            />

            {/* Particles burst */}
            {particles.map((p, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: `radial-gradient(circle, #C3FC00, rgba(195,252,0,0.3))`,
                  boxShadow: '0 0 6px rgba(195,252,0,0.5)',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.55, delay: 0.1 + p.delay, ease: 'easeOut' }}
              />
            ))}

            {/* Skin punch-up — quick scale burst then settle */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.15, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {!imgError && (
                <Image
                  src={imageUrl}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain p-6"
                  onError={() => setImgError(true)}
                />
              )}
            </motion.div>

            {/* Ring shockwave */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C3FC00]/30"
              initial={{ width: 20, height: 20, opacity: 1 }}
              animate={{ width: 200, height: 200, opacity: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover glow overlay */}
      {!isFinished && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-[#C3FC00]/[0.03] to-transparent pointer-events-none" />
      )}
    </div>
  );
}
