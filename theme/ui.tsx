// theme/ui.tsx
// ────────────────────────────────────────────────────────────────────────────
// Shared UI primitives built on top of tokens.
// Screens compose these instead of re-styling buttons/pills inline.
// ────────────────────────────────────────────────────────────────────────────
import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebPressable } from "../components/WebPressable";
import { colors, type, radius, space, metrics, elevation } from "./tokens";

// ── Primary CTA ─────────────────────────────────────────────────────────────
export function CtaButton({
  label,
  icon,
  onPress,
  disabled,
  variant = "primary",
  height = metrics.ctaHeight,
  style,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "gold" | "ghost";
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const isGhost = variant === "ghost";
  const grad =
    variant === "gold" ? colors.gradGold : colors.gradCta;
  const labelColor = isGhost
    ? colors.text
    : variant === "gold"
    ? "#231603"
    : "#04222B";

  return (
    <WebPressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeScale={0.96}
      hoverScale={1.015}
      style={({ pressed, hovered }) => [
        styles.btnWrap,
        { height, opacity: disabled ? 0.45 : pressed ? 0.94 : 1 },
        !isGhost && elevation.glowPrimary,
        variant === "gold" && elevation.glowGold,
        style,
      ]}
    >
      {isGhost ? (
        <View style={[styles.btnInner, styles.ghostInner]}>
          {!!icon && <Ionicons name={icon} size={19} color={colors.primary} />}
          <Text style={[styles.btnLabel, { color: labelColor }]}>{label}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.btnInner}
        >
          {!!icon && (
            <Ionicons name={icon} size={19} color={labelColor} />
          )}
          <Text style={[styles.btnLabel, { color: labelColor }]}>{label}</Text>
        </LinearGradient>
      )}
    </WebPressable>
  );
}

// ── Segmented control (SPIN / XO) ───────────────────────────────────────────
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segWrap}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <WebPressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            activeScale={0.96}
            style={({ pressed }) => [
              styles.segTab,
              active && styles.segTabActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={active ? colors.text : colors.textMuted}
            />
            <Text style={[styles.segLabel, active && styles.segLabelActive]}>
              {tab.label}
            </Text>
          </WebPressable>
        );
      })}
    </View>
  );
}

// ── Small informational chip (Anti-cheat · Fast rounds · …) ─────────────────
export function Chip({
  icon,
  text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? WebPressable : View;
  return (
    <Wrapper
      {...(onPress ? { onPress } : {})}
      style={styles.chip}
    >
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text style={styles.chipText} numberOfLines={1}>
        {text}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  btnInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  ghostInner: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  segWrap: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  segTabActive: {
    backgroundColor: colors.tintPrimary,
    borderWidth: 1,
    borderColor: "rgba(0,218,243,0.35)",
  },
  segLabel: {
    ...type.bodySm,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 1,
  },
  segLabelActive: {
    color: colors.text,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
});
