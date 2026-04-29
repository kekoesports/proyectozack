'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

type MotionRootProps = {
  readonly children: ReactNode;
};

/**
 * App-wide motion provider.
 *
 * - LazyMotion with a thunk: motion features ship in a deferred chunk
 *   (`./motion-features`) that only loads on routes mounting a `m.*`
 *   component. Static imports would pull the runtime into the root layout
 *   bundle for every route, including portal routes that don't use motion.
 *   See `./motion-features.ts` for the feature-bundle rationale.
 *
 * - MotionConfig reducedMotion="user": every motion component below this
 *   provider automatically honours `prefers-reduced-motion: reduce`.
 *   `whileInView` / `animate` / `transition` props degrade gracefully on
 *   devices with reduced motion enabled — without having to add a
 *   `useReducedMotion()` guard inside every component.
 *
 * NOTE: Components should prefer `m.*` (from `motion/react-client`) over
 * `motion.*` to maximise tree-shaking. We don't enable strict mode so both
 * work, but `motion.*` pulls in the full bundle.
 */
export function MotionRoot({ children }: MotionRootProps): React.JSX.Element {
  return (
    <LazyMotion features={() => import('./motion-features').then((m) => m.default)}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
