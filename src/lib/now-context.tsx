'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Provee un `now` (epoch ms) compartido que avanza por intervalos discretos.
 * Permite que componentes que muestran "tiempo restante" o "hace X" se
 * actualicen sin que cada uno arme su propio `setInterval` (un solo timer
 * por subárbol).
 */
const NowContext = createContext<number>(Date.now());

type NowProviderProps = {
  readonly children: ReactNode;
  /** Cada cuánto avanza el reloj compartido. Default: 60s. */
  readonly tickMs?: number;
};

export function NowProvider({ children, tickMs = 60_000 }: NowProviderProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  // Subscripción a un timer compartido — caso permitido por la regla #11.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/** Lee el `now` compartido. Si no hay provider, cae al `Date.now()` del primer render. */
export function useNow(): number {
  return useContext(NowContext);
}
