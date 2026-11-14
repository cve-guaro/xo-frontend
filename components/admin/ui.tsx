// components/admin/ui.tsx
// ─────────────────────────────────────────────────────────────────────
// Shared admin UI primitives — React Native translations of the
// reference dashboard's Panel, Pill, Delta, Button, Meter, Toggle.
// All colors come from adminTheme tokens. No hard-coded hex.
// ─────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, type ReactNode } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAdminTheme } from "../../constants/adminTheme";

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
  return (
    <View style={[
      s.panel,
      { backgroundColor: theme.surface, borderColor: theme.border },
      style,
    ]}>
      {(title || right) && (
        <View style={s.panelHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? <Text style={[s.panelTitle, { color: theme.onSurface }]}>{title}</Text> : null}
            {kicker ? <Text style={[s.panelKicker, { color: theme.onSurfaceVariant }]}>{kicker}</Text> : null}
          </View>
          {right && <View style={s.panelHeaderRight}>{right}</View>}
        </View>
      )}
      <View style={[
        noPadBody ? { padding: 0 } : s.panelBody,
        bodyStyle,
      ]}>
        {children}
      </View>
    </View>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────
type PillTone = "brand" | "gold" | "coral" | "azure" | "muted" | "positive";
export function AdminPill({
  children, tone = "muted", dot,
}: {
  children: string;
  tone?: PillTone;
  dot?: boolean;
}) {
  const { theme, isDark } = useAdminTheme();
  const tones: Record<PillTone, { bg: string; fg: string }> = {
    brand:    { bg: theme.primaryContainer, fg: theme.primary },
    gold:     { bg: "rgba(245,158,11,0.12)", fg: theme.accentGold },
    coral:    { bg: "rgba(239,68,68,0.12)", fg: theme.error },
    azure:    { bg: "rgba(6,182,212,0.12)", fg: theme.accentCyan },
    positive: { bg: "rgba(16,185,129,0.12)", fg: theme.success },
    muted:    { bg: theme.surfaceContainerHighest, fg: theme.onSurfaceVariant },
  };
  const t = tones[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {dot && <View style={[s.pillDot, { backgroundColor: t.fg }]} />}
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
    : good ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";
  const fg = inverse
    ? "#FFFFFF"
    : good ? theme.success : theme.error;
  return (
    <View style={[s.delta, { backgroundColor: bg }]}>
      <Ionicons
        name={up ? "trending-up" : "trending-down"}
        size={12}
        color={fg}
      />
      <Text style={[s.deltaText, { color: fg }]}>
        {Math.abs(value).toFixed(value < 10 ? 1 : 0)}%
      </Text>
    </View>
  );
}

// ── Button ───────────────────────────────────────────────────────────
type BtnTone = "ghost" | "solid" | "brand" | "danger" | "gold";
export function AdminButton({
  children, onPress, tone = "ghost", icon, disabled, size = "md",
}: {
  children?: string;
  onPress?: () => void;
  tone?: BtnTone;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const { theme } = useAdminTheme();
  const toneStyles: Record<BtnTone, { bg: string; fg: string; border: string }> = {
    ghost:  { bg: theme.surface, fg: theme.onSurfaceVariant, border: theme.border },
    solid:  { bg: theme.onSurface, fg: theme.surface, border: "transparent" },
    brand:  { bg: theme.primary, fg: "#FFFFFF", border: "transparent" },
    danger: { bg: "rgba(239,68,68,0.12)", fg: theme.error, border: "rgba(239,68,68,0.2)" },
    gold:   { bg: theme.primaryContainer, fg: theme.primary, border: "rgba(255,45,85,0.2)" },
  };
  const t = toneStyles[tone];
  const h = size === "xs" ? 28 : size === "sm" ? 32 : 36;
  const px = size === "xs" ? 8 : size === "sm" ? 12 : 14;
  const fs = size === "xs" ? 10.5 : 11;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        s.btn,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          minHeight: h,
          paddingHorizontal: px,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={size === "xs" ? 13 : 15} color={t.fg} />}
      {children ? <Text style={[s.btnText, { color: t.fg, fontSize: fs }]}>{children}</Text> : null}
    </TouchableOpacity>
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
      useNativeDriver: false,
    }).start();
  }, [safe]);
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
  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!checked)}
      activeOpacity={0.85}
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
      <View style={[
        s.toggleThumb,
        { transform: [{ translateX: checked ? 18 : 2 }] },
      ]} />
    </TouchableOpacity>
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
      <Text style={[s.kpiValue, { color: featured ? "#FFFFFF" : theme.onSurface }]}>
        {value}
      </Text>

      {/* Delta row */}
      {delta !== undefined && (
        <View style={s.kpiDeltaRow}>
          <AdminDelta value={delta} inverse={featured} />
          <Text style={[s.kpiDeltaNote, { color: featured ? "rgba(255,255,255,0.7)" : theme.onSurfaceVariant }]}>
            vs previous period
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
    <TouchableOpacity
      onPress={() => onPress(field)}
      activeOpacity={0.75}
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
        <Ionicons
          name={dir === 1 ? "arrow-up" : "arrow-down"}
          size={10}
          color={theme.onSurface}
        />
      )}
    </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => onPage(page - 1)}
          disabled={page === 0}
          style={[s.pagerBtn, { borderColor: theme.border, opacity: page === 0 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-back" size={13} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={[s.pagerPageNum, { color: theme.onSurfaceVariant }]}>
          {page + 1} / {pages}
        </Text>
        <TouchableOpacity
          onPress={() => onPage(page + 1)}
          disabled={page >= pages - 1}
          style={[s.pagerBtn, { borderColor: theme.border, opacity: page >= pages - 1 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={13} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Panel
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
  },

  // Pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },

  // Delta
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Button
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
  },
  btnText: {
    fontWeight: "700",
  },

  // Meter
  meterTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  meterFill: {
    height: "100%",
    borderRadius: 3,
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
    minHeight: 140,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kpiIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
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
