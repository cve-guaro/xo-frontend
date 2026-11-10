/**
 * Unified Responsive Breakpoints for XO Ethiopia (XOET)
 * 
 * 4 Structural Width Breakpoints:
 * - Mobile:      < 768px   (Single column, bottom navigation, bottom sheets)
 * - Tablet:      768px - 1023px (Collapsed 72px icon rail, 2-column stacked layout)
 * - Desktop:     1024px - 1279px (Full sidebar, 2-column spacious gaming layout)
 * - Wide:        >= 1280px (3-column colosseum: Left rail, Center arena, Right live sidebar)
 * - Ultra-wide:  >= 1520px (Multi-card 3D perspective carousel expansion)
 * 
 * Height Thresholds:
 * - Short screen: < 500px (Phones in landscape orientation e.g. 844x390, compact laptop windows)
 */

export const BREAKPOINTS = {
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1280,
  ULTRAWIDE: 1520,
} as const;

export const HEIGHT_THRESHOLDS = {
  SHORT_SCREEN: 560,       // Landscape phone (e.g. 844x390) or ultra-compact window
  COMPACT_DESKTOP: 760,    // Standard 13"-14" laptops with browser address bars
  STANDARD_DESKTOP: 880,   // Full-height 1080p+ screens
} as const;

/**
 * Mathematical clamp helper: restricts a value between min and max
 */
export const clamp = (min: number, val: number, max: number): number => {
  return Math.max(min, Math.min(val, max));
};

/**
 * Layout configuration and dimension helpers
 */
export function getResponsiveLayout(winW: number, winH: number) {
  const isMobile = winW < BREAKPOINTS.TABLET;
  const isTablet = winW >= BREAKPOINTS.TABLET && winW < BREAKPOINTS.DESKTOP;
  const isDesktop = winW >= BREAKPOINTS.DESKTOP;
  const isWide = winW >= BREAKPOINTS.WIDE;
  const isUltraWide = winW >= BREAKPOINTS.ULTRAWIDE;

  // Short screen detection (landscape phone or ultra-short window)
  const isShortScreen = winH < HEIGHT_THRESHOLDS.SHORT_SCREEN;

  // Tablet 2-column vs Desktop 3-column
  // Under 1280px (e.g. 1024-1279px), 2-column layout prevents arena compression
  const isTabletLayout = winW < BREAKPOINTS.WIDE;

  // Multi-card reveal in carousel
  const showMultiCards = isUltraWide;

  // Fluid dimensions using smooth proportional clamp formulas (Generous PC card scale & Portrait ratio)
  const heroArtH = isShortScreen
    ? 110
    : Math.round(clamp(220, winH * 0.36, 360));

  const centerCardMinH = isShortScreen
    ? 260
    : Math.round(clamp(460, winH * 0.54, 580));

  const centerCardMaxH = isShortScreen
    ? 290
    : Math.round(clamp(500, winH * 0.60, 640));

  const sideArtH = isShortScreen
    ? 80
    : Math.round(clamp(150, winH * 0.25, 260));

  const sideCardMinH = isShortScreen
    ? 220
    : Math.round(clamp(360, winH * 0.44, 480));

  const sideCardMaxH = isShortScreen
    ? 250
    : Math.round(clamp(400, winH * 0.50, 530));

  const actionBtnH = isShortScreen
    ? 34
    : Math.round(clamp(42, winH * 0.054, 50));

  const outerShelfH = isShortScreen
    ? 32
    : Math.round(clamp(40, winH * 0.048, 46));

  // carouselH is strictly calculated from centerCardMaxH + outerShelfH + vertical margin
  // This guarantees Play with Friends is NEVER clipped by overflow:hidden
  const carouselH = centerCardMaxH + outerShelfH + (isShortScreen ? 12 : 24);

  // Symmetrical sidebar widths
  const isNarrowDesktop = winW < 1440;
  const leftSidebarW = isNarrowDesktop ? 275 : 290;
  const rightSidebarW = isNarrowDesktop ? 275 : 290;
  const columnGap = isNarrowDesktop ? 16 : 20;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isUltraWide,
    isShortScreen,
    isTabletLayout,
    showMultiCards,
    heroArtH,
    centerCardMinH,
    centerCardMaxH,
    sideArtH,
    sideCardMinH,
    sideCardMaxH,
    actionBtnH,
    outerShelfH,
    carouselH,
    leftSidebarW,
    rightSidebarW,
    columnGap,
  };
}
