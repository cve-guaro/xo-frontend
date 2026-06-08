// components/game/HeaderPill.tsx
// HeaderPill and InfoPill — small pill-shaped UI elements for the gameplay header.
import React, { memo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export const HeaderPill = memo(function HeaderPill({
  onPress,
  icon,
  text,
  gradient,
}: {
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text?: string;
  gradient: [string, string];
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.pillOuter}>
      <LinearGradient colors={gradient} style={styles.pillInner}>
        <Ionicons name={icon} size={16} color="#fff" />
        {!!text && <Text style={styles.pillText}>{text}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
});

export const InfoPill = memo(function InfoPill({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.78)" />
      <Text
        style={styles.infoText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {text}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pillOuter: { borderRadius: 14, overflow: "hidden" },
  pillInner: { height: 38, paddingHorizontal: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
  },
});
