// components/game/MobileQuickTile.tsx
// Action tile for the mobile lobby. Token-based accent, real press feedback.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebPressable } from "../WebPressable";
import { colors, type, radius, space, metrics } from "../../theme/tokens";

export type TileAccent = "violet" | "gold" | "cyan";

const ACCENTS: Record<
  TileAccent,
  { fg: string; bg: string; ring: string }
> = {
  violet: {
    fg: colors.violetSoft,
    bg: colors.tintViolet,
    ring: "rgba(139,92,246,0.4)",
  },
  gold: {
    fg: colors.gold,
    bg: colors.tintGold,
    ring: "rgba(245,182,66,0.4)",
  },
  cyan: {
    fg: colors.primary,
    bg: colors.tintPrimary,
    ring: "rgba(0,218,243,0.4)",
  },
};

interface MobileQuickTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  accent?: TileAccent;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const MobileQuickTile = ({
  icon,
  accent = "cyan",
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
}: MobileQuickTileProps) => {
  // Legacy props still win if a caller passes explicit colors.
  const a = iconColor
    ? { fg: iconColor, bg: iconBgColor || "rgba(255,255,255,0.05)", ring: "rgba(255,255,255,0.14)" }
    : ACCENTS[accent];

  return (
    <WebPressable
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.cardContainer,
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        hovered && { borderColor: colors.borderStrong, backgroundColor: colors.cardRaised },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: a.bg, borderColor: a.ring }]}>
        <Ionicons name={icon} size={21} color={a.fg} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <Text style={styles.subtitleText} numberOfLines={1} adjustsFontSizeToFit>
          {subtitle}
        </Text>
      </View>
    </WebPressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  iconBox: {
    width: metrics.tileIconSize,
    height: metrics.tileIconSize,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
  },
  titleText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: 8.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 2,
  },
});

export default MobileQuickTile;
