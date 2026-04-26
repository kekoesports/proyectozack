/**
 * Lazy-loaded motion feature bundle.
 *
 * Imported via `LazyMotion features={() => import('./motion-features')}` so
 * the motion runtime ships in a separate chunk that only loads on routes
 * that actually mount a `m.*` component. Static imports of `domMax` would
 * defeat `LazyMotion` and pull ~85 KB raw / ~28 KB gzipped into the root
 * layout bundle on every route — including portal routes that don't use
 * motion at all.
 *
 * We use `domMax` (not `domAnimation`) because the codebase relies on
 * `layoutId` (`FilterTabs` slides the active-tab indicator). `domMax` adds
 * `drag` + `pan` features that are unused — about 30 KB of dead code we
 * could shave by reaching into motion's private feature exports, but the
 * chunk is already deferred and the API isn't public.
 */
export { domMax as default } from 'motion/react';
