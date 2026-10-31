/**
 * Motion tokens for product chrome (home, tabs, buttons, cards, dialogs, toasts, lists).
 * Source: the `motion`, `transitions` and `reduced-motion` skills.
 * Pure numbers only (no React Native import) so they can be unit tested anywhere.
 *
 * The game stage (wheel physics, board marks, matchmaking radar) is a documented exception
 * and keeps its own expressive motion; see ux-profile.md > Notes.
 */

/** The only durations allowed on chrome. Snap a design's 250ms to 200 or 300. */
export const DUR = { micro: 100, fast: 150, base: 200, large: 300 } as const;
export type Duration = (typeof DUR)[keyof typeof DUR];

/** CSS cubic-bezier tokens (--ease-out / --ease-in) as control points. */
export const BEZIER = {
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
} as const;

/** Press feedback: a 2% shrink. Under reduced motion we dim instead of scaling. */
export const PRESS = { scale: 0.98, reducedOpacity: 0.85 } as const;

/** Enter/exit offset for overlays: small translate (4-8px), never a big slide. */
export const OVERLAY_OFFSET = 8;

export const STAGGER = { step: 30, cap: 200, maxItems: 10 } as const;

/**
 * delay(i) = min(i * 30ms, 200ms).
 * Only short first-paint lists (<= 10 items) are staggered; longer lists, filter updates and
 * virtualized lists get no stagger.
 */
export function staggerDelay(index: number, count: number): number {
  if (index < 0 || count > STAGGER.maxItems) return 0;
  return Math.min(index * STAGGER.step, STAGGER.cap);
}
