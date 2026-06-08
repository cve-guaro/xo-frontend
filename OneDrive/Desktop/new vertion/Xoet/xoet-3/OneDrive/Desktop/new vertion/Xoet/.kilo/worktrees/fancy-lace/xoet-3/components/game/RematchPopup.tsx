// components/game/RematchTopPopup.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, Platform } from "react-native";

type Props = {
  visible: boolean;
  fromName?: string;
  amount?: number;
  onAccept: () => void;
  onDecline: () => void;
};

export default function RematchTopPopup({
  visible,
  fromName = "Opponent",
  amount = 0,
  onAccept,
  onDecline,
}: Props) {
  const y = useRef(new Animated.Value(-80)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: -80, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(op, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, y, op]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.wrap, { opacity: op, transform: [{ translateY: y }] }]}
    >
      {/* Ultra transparent container */}
      {Platform.OS === 'web' ? (
        <View style={[styles.card, { backgroundColor: "rgb(12, 16, 28)" }]}>
          <View style={styles.row}>
            <Ionicons name="repeat" size={16} color="#00E5FF" />
            <Text style={styles.title} numberOfLines={1}>
              {fromName} invites a rematch
            </Text>
          </View>

          <Text style={styles.sub} numberOfLines={1}>
            Wager • ETB {amount}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onDecline} style={[styles.btn, styles.decline]}>
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.btnText}>Decline</Text>
            </Pressable>

            <Pressable onPress={onAccept} style={[styles.btn, styles.accept]}>
              <Ionicons name="checkmark" size={14} color="#000" />
              <Text style={[styles.btnText, { color: "#000" }]}>Accept</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={["rgb(12, 16, 28)", "rgba(12, 16, 28, 0.68)"]}
          style={styles.card}
        >
          <View style={styles.row}>
            <Ionicons name="repeat" size={16} color="#00E5FF" />
            <Text style={styles.title} numberOfLines={1}>
              {fromName} invites a rematch
            </Text>
          </View>

          <Text style={styles.sub} numberOfLines={1}>
            Wager • ETB {amount}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onDecline} style={[styles.btn, styles.decline]}>
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.btnText}>Decline</Text>
            </Pressable>

            <Pressable onPress={onAccept} style={[styles.btn, styles.accept]}>
              <Ionicons name="checkmark" size={14} color="#000" />
              <Text style={[styles.btnText, { color: "#000" }]}>Accept</Text>
            </Pressable>
          </View>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 50,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden', // needed for gradient
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: "#E5E7EB",
    fontWeight: "800",
    fontSize: 13,
    flex: 1,
  },
  sub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  decline: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  accept: {
    backgroundColor: "#00E5FF",
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
