'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Single shared interval — all CountdownTimer instances subscribe to this
let listeners: Array<(now: number) => void> = [];
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(fn: (now: number) => void) {
  listeners.push(fn);
  if (!intervalId) {
    intervalId = setInterval(() => {
      const now = Date.now();
      for (const l of listeners) l(now);
    }, 1000);
  }
  return () => {
    listeners = listeners.filter((l) => l !== fn);
    if (listeners.length === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(endsAt: string, now: number): TimeLeft | null {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

type CountdownTimerProps = {
  endsAt: string;
  onExpiredAction?: () => void;
}

function FlipDigit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-12 gw-digit rounded-lg flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-xl font-black text-[#C3FC00] tabular-nums"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
        {label}
      </span>
    </div>
  );
}

/**
 * Timer regresivo hasta el cierre de un giveaway; dispara onExpiredAction al expirar.
 *
 * @kind client
 * @feature creator-codes
 * @route /[creatorSlug]
 * @example
 * ```tsx
 * <CountdownTimer endsAt={giveaway.endsAt} onExpiredAction={refresh} />
 * ```
 */
export function CountdownTimer({ endsAt, onExpiredAction }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calcTimeLeft(endsAt, Date.now())
  );

  const tick = useCallback((now: number) => {
    const tl = calcTimeLeft(endsAt, now);
    setTimeLeft(tl);
    if (!tl) onExpiredAction?.();
  }, [endsAt, onExpiredAction]);

  useEffect(() => {
    return subscribe(tick);
  }, [tick]);

  if (!timeLeft) {
    return (
      <div className="inline-flex px-4 py-2 rounded-lg bg-white/5 border border-white/10">
        <span className="text-sm font-bold uppercase tracking-wider text-white/50">Finalizado</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <FlipDigit value={timeLeft.days} label="Días" />
      <FlipDigit value={timeLeft.hours} label="Hrs" />
      <FlipDigit value={timeLeft.minutes} label="Min" />
      <FlipDigit value={timeLeft.seconds} label="Seg" />
    </div>
  );
}
