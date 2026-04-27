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

// Viewport options para whileInView (reutilizable).
//
// `amount: 0` + permissive bottom margin makes the observer fire as soon as
// any pixel of the element approaches the viewport. The previous value of
// `0.15` was too restrictive on mobile, where tall grids could not reach 15%
// visibility before the user scrolled past, leaving sections invisible
// forever (the section appeared as a black void). Components using this
// config should still defend with a fail-safe timer in case the observer
// never fires for other reasons (late hydration, lazy chunk, etc.).
export const VIEWPORT = {
  once: true,
  amount: 0,
  margin: '0px 0px -64px 0px',
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
