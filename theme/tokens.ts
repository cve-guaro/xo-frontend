// theme/tokens.ts
// ────────────────────────────────────────────────────────────────────────────
// Xoet Design System — single source of truth.
// Production rule: components NEVER hardcode hex values. Import tokens.
//
// Brand direction: deep "midnight violet" surfaces + a single electric cyan
// primary + restrained gold reserved exclusively for money/rewards.
// ────────────────────────────────────────────────────────────────────────────

// ── Primitives ──────────────────────────────────────────────────────────────
const P = {
  // Neutrals — cool violet-tinted dark ramp
  ink950: "#07070E", // page background (deepest)
  ink900: "#0B0B16", // screen background
  ink850: "#10101F", // card background
  ink800: "#16162A", // raised surface / input
  ink700: "#1E1E36", // hover / active surface
  ink600: "#2A2A45", // borders on dark
  ink500: "#3A3A58", // strong borders / dividers
  ink400: "#565678", // disabled text
  ink300: "#8B8FA8", // secondary text
  ink200: "#B4B8CC", // primary text on dark (soft)
  ink100: "#EDEEF4", // headings

  // Brand
  cyan300: "#67E8F9",
  cyan400: "#22D3EE",
  cyan500: "#00DAF3", // primary action
  cyan600: "#0891B2",

  violet400: "#A78BFA",
  violet500: "#8B5CF6",
  violet600: "#7C3AED",

  // Accents (semantic, sparing use)
  gold300: "#FCD34D",
  gold400: "#F5B642", // money / rewards ONLY
  gold500: "#D99A1F",

  green400: "#34D399",
  green500: "#10B981",

  red400: "#F87171",
  red500: "#EF4444",

  orange400: "#FB923C",

  blue400: "#60A5FA",
};

// ── Semantic palette ────────────────────────────────────────────────────────
export const colors = {
  // Surfaces
  bg: P.ink900,
  bgDeep: P.ink950,
  card: P.ink850,
  cardRaised: P.ink800,
  surfaceHover: P.ink700,

  // Lines
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.06)",

  // Text
  text: P.ink100,
  textSoft: P.ink200,
  textMuted: P.ink300,
  textFaint: P.ink400,

  // Brand
  primary: P.cyan500,
  primarySoft: P.cyan400,
  primaryDeep: P.cyan600,
  violet: P.violet500,
  violetSoft: P.violet400,

  // Semantic
  gold: P.gold400,
  goldSoft: P.gold300,
  success: P.green500,
  successSoft: P.green400,
  danger: P.red500,
  dangerSoft: P.red400,
  warning: P.orange400,
  info: P.blue400,

  // Alpha tints (for subtle fills)
  tintPrimary: "rgba(0,218,243,0.10)",
  tintPrimaryStrong: "rgba(0,218,243,0.18)",
  tintViolet: "rgba(139,92,246,0.12)",
  tintGold: "rgba(245,182,66,0.12)",
  tintSuccess: "rgba(16,185,129,0.12)",
  tintDanger: "rgba(239,68,68,0.12)",

  // Gradients (paired stops, keep count low)
  gradPrimary: ["#00DAF3", "#0891B2"] as [string, string],
  gradViolet: ["#8B5CF6", "#6D28D9"] as [string, string],
  gradGold: ["#F5B642", "#D99A1F"] as [string, string],
  gradCard: ["#131324", "#0D0D1C"] as [string, string],
  gradCta: ["#00E5FF", "#0099FF"] as [string, string],
};

// ── Typography ──────────────────────────────────────────────────────────────
// Scale is deliberate: display → body → caption. No ad-hoc sizes.
export const type = {
  display: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.3 },
  title: { fontSize: 17, fontWeight: "800" as const, letterSpacing: 0 },
  titleSm: { fontSize: 15, fontWeight: "700" as const, letterSpacing: 0 },
  body: { fontSize: 14, fontWeight: "600" as const, letterSpacing: 0 },
  bodySm: { fontSize: 12.5, fontWeight: "600" as const },
  label: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
  micro: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.6 },
  tiny: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.8 },
};

// ── Spacing (4pt grid) ──────────────────────────────────────────────────────
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

// ── Radius ──────────────────────────────────────────────────────────────────
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// ── Elevation (shadow presets) ──────────────────────────────────────────────
export const elevation = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 9,
  },
  glowPrimary: {
    shadowColor: P.cyan500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  glowGold: {
    shadowColor: P.gold400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ── Component metrics (shared measurements) ─────────────────────────────────
export const metrics = {
  bottomBarHeight: 76,
  screenPaddingX: 18,
  tileIconSize: 42,
  avatarSize: 44,
  ctaHeight: 54,
  ctaHeightSm: 48,
};
