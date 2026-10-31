/**
 * Geometry for a sliding tab indicator that follows a paged carousel.
 * `inset` is the gap between the indicator and the tab bar's edge.
 */
export function pillMetrics(containerWidth: number, count: number, inset: number) {
  const usable = Math.max(containerWidth - inset * 2, 0);
  const slot = count > 0 ? usable / count : 0;
  return { slot, travel: slot * Math.max(count - 1, 0) };
}
