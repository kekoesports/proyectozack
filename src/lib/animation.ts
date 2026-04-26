// Duraciones en segundos
export const DURATION = {
  fast: 0.2,
  base: 0.4,
  slow: 0.6,
} as const;

// Easings estándar
export const EASE = {
  out: 'easeOut',
  inOut: 'easeInOut',
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// Stagger entre items de grid (segundos)
export const STAGGER = {
  tight: 0.05,
  base: 0.07,
  loose: 0.1,
} as const;

// Viewport options para whileInView (reutilizable)
export const VIEWPORT = {
  once: true,
  amount: 0.15,
} as const;

// Variantes reutilizables para fade+slide
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
} as const;

// Variantes para stagger container
export const staggerContainer = (stagger = STAGGER.base) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});
