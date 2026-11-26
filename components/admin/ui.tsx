// components/admin/ui.tsx
// ─────────────────────────────────────────────────────────────────────
// Shared admin UI primitives — React Native translations of the
// reference dashboard's Panel, Pill, Delta, Button, Meter, Toggle, KPI.
// All colors come from adminTheme tokens. No hard-coded hex.
// ─────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import {
  View, Text, Pressable, StyleSheet, Animated, Platform, Easing, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdminTheme } from "../../constants/adminTheme";

// ── helpers ──────────────────────────────────────────────────────────
// Blend a hex token with an alpha channel so tones derive from theme tokens
// instead of hard-coded rgba() strings.
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Responsive metrics mirroring the reference's mobile/desktop pairs.
function useAdminMetrics() {
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  return {
    wide,
    panelPad: wide ? 24 : 20,
    panelTitleFs: wide ? 17 : 16,
    panelKickerFs: wide ? 12 : 11,
    kpiValueFs: wide ? 28 : 25,
  };
}

// ── Panel ────────────────────────────────────────────────────────────
export function AdminPanel({
  title, kicker, right, children, style, bodyStyle, noPadBody,
}: {
  title?: string;
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: any;
  bodyStyle?: any;
  noPadBody?: boolean;
}) {
  const { theme } = useAdminTheme();
  const m = useAdminMetrics();
  return (
    <View style={[
      s.panel,
      { backgroundColor: theme.surface, borderColor: theme.border },
      style,
    ]}>
      {(title || right) && (
        <View style={[s.panelHeader, { paddingHorizontal: m.panelPad, paddingTop: m.panelPad }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Text style={[s.panelTitle, { color: theme.onSurface, fontSize: m.panelTitleFs }]}>
                {title}
              </Text>
            ) : null}
            {kicker ? (
              <Text style={[s.panelKicker, { color: theme.onSurfaceVariant, fontSize: m.panelKickerFs }]}>
                {kicker}
              </Text>
            ) : null}
          </View>
          {right && <View style={s.panelHeaderRight}>{right}</View>}
        </View>
      )}
      <View style={[
        noPadBody ? { padding: 0 } : [s.panelBody, { paddingHorizontal: m.panelPad, paddingBottom: m.panelPad }],
        bodyStyle,
      ]}>
        {children}
      </View>
    </View>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────
export type PillTone = "brand" | "gold" | "coral" | "azure" | "muted" | "positive" | "neutral" | "danger" | "success" | "warning";
export function AdminPill({
  children, tone = "muted", dot, pulse = false,
}: {
  children: ReactNode;
  tone?: PillTone | string;
  dot?: boolean;
  pulse?: boolean;
}) {
  const { theme } = useAdminTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (dot && pulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    return undefined;
  }, [dot, pulse, pulseAnim]);

  const tones: Record<string, { bg: string; fg: string }> = {
    brand:    { bg: theme.primaryContainer, fg: theme.primary },
    gold:     { bg: alpha(theme.accentGold, 0.12), fg: theme.accentGold },
    coral:    { bg: alpha(theme.error, 0.12), fg: theme.error },
    azure:    { bg: alpha(theme.accentCyan, 0.12), fg: theme.accentCyan },
    positive: { bg: alpha(theme.success, 0.12), fg: theme.success },
    muted:    { bg: theme.surfaceContainerHighest, fg: theme.onSurfaceVariant },
    neutral:  { bg: theme.surfaceContainerHighest, fg: theme.onSurfaceVariant },
    danger:   { bg: alpha(theme.error, 0.12), fg: theme.error },
    success:  { bg: alpha(theme.success, 0.12), fg: theme.success },
    warning:  { bg: alpha(theme.accentGold, 0.12), fg: theme.accentGold },
  };
  const t = tones[tone] || tones.muted;
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {dot && (
        <Animated.View style={[s.pillDot, { backgroundColor: t.fg, opacity: pulse ? pulseAnim : 1 }]} />
      )}
      <Text style={[s.pillText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

// ── Delta (percentage change indicator) ──────────────────────────────
export function AdminDelta({
  value, invert = false, inverse = false,
}: {
  value: number;
  invert?: boolean;
  inverse?: boolean;
}) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const { theme } = useAdminTheme();
  const bg = inverse
    ? "rgba(255,255,255,0.2)"
    : good ? alpha(theme.success, 0.12) : alpha(theme.error, 0.12);
  const fg = inverse
    ? "#FFFFFF"
    : good ? theme.success : theme.error;
  return (
    <View style={[s.delta, { backgroundColor: bg }]}>
      <Ionicons name={up ? "trending-up" : "trending-down"} size={12} color={fg} />
      <Text style={[s.deltaText, { color: fg }]}>
        {Math.abs(value).toFixed(value < 10 ? 1 : 0)}%
      </Text>
    </View>
  );
}

// ── Button ───────────────────────────────────────────────────────────
type BtnTone = "ghost" | "solid" | "brand" | "danger" | "gold";
// Injected CSS for smooth web animations
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('admin-spin-keyframes')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'admin-spin-keyframes';
    styleTag.textContent = `
      @keyframes adminSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleTag);
  }
}

export function AdminButton({
  children, onPress, tone = "ghost", icon, disabled, size = "md", loading = false,
}: {
  children?: string;
  onPress?: () => void;
  tone?: BtnTone;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  loading?: boolean;
}) {
  const { theme } = useAdminTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const spinVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (loading && Platform.OS !== 'web') {
      anim = Animated.loop(
        Animated.timing(spinVal, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      spinVal.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [loading, spinVal]);

  const spin = spinVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const toneStyles: Record<BtnTone, { bg: string; fg: string; border: string }> = {
    ghost:  { bg: theme.surface, fg: theme.onSurfaceVariant, border: theme.border },
    solid:  { bg: theme.onSurface, fg: theme.surface, border: "transparent" },
    brand:  { bg: theme.primary, fg: "#FFFFFF", border: "transparent" },
    danger: { bg: alpha(theme.error, 0.12), fg: theme.error, border: alpha(theme.error, 0.2) },
    gold:   { bg: theme.primaryContainer, fg: theme.primary, border: alpha(theme.primary, 0.2) },
  };
  const t = toneStyles[tone];
  const h = size === "xs" ? 28 : size === "sm" ? 32 : 36;
  const px = size === "xs" ? 8 : size === "sm" ? 12 : 14;
  const fs = size === "md" ? 12 : 11;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.97, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          s.btn,
          {
            backgroundColor: t.bg,
            borderColor: t.border,
            minHeight: h,
            paddingHorizontal: px,
            opacity: disabled ? 0.45 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {icon && (
          loading ? (
            <Animated.View style={Platform.OS === 'web' ? ({ animation: 'adminSpin 0.75s linear infinite' } as any) : { transform: [{ rotate: spin }] }}>
              <Ionicons name={icon} size={size === "xs" ? 13 : 15} color={t.fg} />
            </Animated.View>
          ) : (
            <Ionicons name={icon} size={size === "xs" ? 13 : 15} color={t.fg} />
          )
        )}
        {children ? <Text style={[s.btnText, { color: t.fg, fontSize: fs }]}>{children}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

// ── Meter (progress bar) ─────────────────────────────────────────────
export function AdminMeter({
  value, tone = "brand", label,
}: {
  value: number;
  tone?: "brand" | "gold" | "coral" | "graphite";
  label?: string;
}) {
  const { theme } = useAdminTheme();
  const width = useRef(new Animated.Value(0)).current;
  const safe = Math.max(0, Math.min(100, value));
  useEffect(() => {
    Animated.timing(width, {
      toValue: safe,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [safe, width]);
  const colors: Record<string, string> = {
    brand: theme.primary,
    gold: theme.accentGold,
    coral: theme.error,
    graphite: theme.onSurfaceVariant,
  };
  return (
    <View
      style={[s.meterTrack, { backgroundColor: theme.surfaceContainerHighest }]}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          s.meterFill,
          {
            backgroundColor: colors[tone],
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

// ── Toggle (switch) ──────────────────────────────────────────────────
export function AdminToggle({
  checked, onChange, label, disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const { theme } = useAdminTheme();
  const animX = useRef(new Animated.Value(checked ? 18 : 2)).current;

  useEffect(() => {
    Animated.spring(animX, {
      toValue: checked ? 18 : 2,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 4,
      speed: 18,
    }).start();
  }, [checked, animX]);

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[
        s.toggle,
        {
          backgroundColor: checked ? theme.primary : theme.surfaceContainerHighest,
          borderColor: checked ? theme.primary : theme.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          s.toggleThumb,
          { transform: [{ translateX: animX }] },
        ]}
      />
    </Pressable>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────
export function AdminKpiCard({
  label, value, delta, icon, featured,
  note,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: keyof typeof Ionicons.glyphMap;
  featured?: boolean;
  note?: string;
}) {
  const { theme } = useAdminTheme();
  const m = useAdminMetrics();
  return (
    <View style={[
      s.kpiCard,
      featured
        ? { backgroundColor: theme.primary, borderColor: theme.primary }
        : { backgroundColor: theme.surface, borderColor: theme.border },
    ]}>
      {/* Header row: icon + label */}
      <View style={s.kpiHeader}>
        <View style={[
          s.kpiIconCircle,
          featured
            ? { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.65)" }
            : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.border },
        ]}>
          <Ionicons name={icon} size={15} color={featured ? "#FFFFFF" : theme.onSurfaceVariant} />
        </View>
        <Text
          numberOfLines={1}
          style={[s.kpiLabel, { color: featured ? "#FFFFFF" : theme.onSurfaceVariant }]}
        >
          {label}
        </Text>
      </View>

      {/* Big value */}
      <Text style={[s.kpiValue, { color: featured ? "#FFFFFF" : theme.onSurface, fontSize: m.kpiValueFs }]}>
        {value}
      </Text>

      {/* Delta row */}
      {delta !== undefined && (
        <View style={s.kpiDeltaRow}>
          <AdminDelta value={delta} inverse={featured} />
          <Text style={[s.kpiDeltaNote, { color: featured ? "rgba(255,255,255,0.7)" : theme.onSurfaceVariant }]}>
            {note ?? "vs previous period"}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Table helper: SortableHeader ─────────────────────────────────────
export function SortHeader({
  label, field, active, dir, onPress, align = "left",
}: {
  label: string;
  field: string;
  active: boolean;
  dir: 1 | -1;
  onPress: (field: string) => void;
  align?: "left" | "right";
}) {
  const { theme } = useAdminTheme();
  return (
    <Pressable
      onPress={() => onPress(field)}
      style={[s.sortHeader, align === "right" && { justifyContent: "flex-end" }]}
    >
      <Text style={[
        s.sortHeaderText,
        { color: active ? theme.onSurface : theme.onSurfaceVariant },
        align === "right" && { textAlign: "right" },
      ]}>
        {label}
      </Text>
      {active && (
        <Ionicons name={dir === 1 ? "arrow-up" : "arrow-down"} size={10} color={theme.onSurface} />
      )}
    </Pressable>
  );
}

// ── Pager ────────────────────────────────────────────────────────────
export function AdminPager({
  page, pages, count, size, label, onPage,
}: {
  page: number;
  pages: number;
  count: number;
  size: number;
  label: string;
  onPage: (p: number) => void;
}) {
  const { theme } = useAdminTheme();
  const from = count ? page * size + 1 : 0;
  const to = Math.min(count, (page + 1) * size);
  return (
    <View style={[s.pager, { borderTopColor: theme.border }]}>
      <Text style={[s.pagerInfo, { color: theme.onSurfaceVariant }]}>
        {from}-{to} of {count} {label}
      </Text>
      <View style={s.pagerBtns}>
        <Pressable
          onPress={() => onPage(page - 1)}
          disabled={page === 0}
          style={[s.pagerBtn, { borderColor: theme.border, opacity: page === 0 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-back" size={13} color={theme.onSurfaceVariant} />
        </Pressable>
        <Text style={[s.pagerPageNum, { color: theme.onSurfaceVariant }]}>
          {page + 1} / {pages}
        </Text>
        <Pressable
          onPress={() => onPage(page + 1)}
          disabled={page >= pages - 1}
          style={[s.pagerBtn, { borderColor: theme.border, opacity: page >= pages - 1 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={13} color={theme.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Reveal (entrance animation) ──────────────────────────────────────
export function AdminReveal({
  children, delay = 0, style,
}: {
  children: ReactNode;
  delay?: number;
  style?: any;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 350,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, v]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ── useCountUp (animated number) ─────────────────────────────────────
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    fromRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Panel
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  panelKicker: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 15,
  },
  panelHeaderRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  panelBody: {
    paddingTop: 12,
  },

  // Pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "600",
  },

  // Delta
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Button
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 4,
  },
  btnText: {
    fontWeight: "700",
  },

  // Meter
  meterTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    width: "100%",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
  },

  // Toggle
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "web" ? { boxShadow: "0 1px 3px rgba(0,0,0,0.2)" } as any : {}),
  },

  // KPI Card
  kpiCard: {
    flex: 1,
    minHeight: 150,
    minWidth: 0,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -1.5,
    marginTop: 12,
  },
  kpiDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  kpiDeltaNote: {
    fontSize: 10,
    fontWeight: "500",
  },

  // Sort Header
  sortHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortHeaderText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  // Pager
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pagerInfo: {
    fontSize: 10.5,
  },
  pagerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pagerBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerPageNum: {
    fontSize: 10.5,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
});