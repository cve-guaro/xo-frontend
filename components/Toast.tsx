import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";

export default function Toast({
  visible,
  message,
  icon = "alert-circle",
  color = "#00ccff",
  duration = 2500,
  onHide,
}: {
  visible: boolean;
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  duration?: number;
  onHide?: () => void;
}) {
  const slide = useRef(new Animated.Value(80)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();

      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(slide, { toValue: 80, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        ]).start(() => onHide?.());
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY: slide }],
          opacity: fade,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  text: { fontWeight: "700", flex: 1 },
});
