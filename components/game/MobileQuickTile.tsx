// components/game/MobileQuickTile.tsx
// Upgraded Luxury Action Card for Mobile Gameplay Landing Screen.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MobileQuickTileProps {
  icon: string;
  iconColor: string;
  iconBgColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const MobileQuickTile = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
}: MobileQuickTileProps) => {
  const containerBg = iconBgColor || (
    iconColor.includes("60a5fa") || iconColor.includes("3b82f6")
      ? "rgba(59, 130, 246, 0.15)"
      : iconColor.includes("eab308") || iconColor.includes("f5b642")
      ? "rgba(234, 179, 8, 0.15)"
      : "rgba(0, 218, 243, 0.15)"
  );

  const iconBorderColor = (
    iconColor.includes("60a5fa") || iconColor.includes("3b82f6")
      ? "rgba(59, 130, 246, 0.35)"
      : iconColor.includes("eab308") || iconColor.includes("f5b642")
      ? "rgba(234, 179, 8, 0.35)"
      : "rgba(0, 218, 243, 0.35)"
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.cardContainer}
    >
      {/* Icon Capsule Box */}
      <View style={[styles.iconBox, { backgroundColor: containerBg, borderColor: iconBorderColor }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>

      {/* Title & Subtitle with Chevron */}
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitleText} numberOfLines={1} adjustsFontSizeToFit>
            {subtitle}
          </Text>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: "#0d0f22",
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: "rgba(139, 92, 246, 0.18)",
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
  },
  titleText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  subtitleText: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chevronText: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
  },
});

export default MobileQuickTile;
