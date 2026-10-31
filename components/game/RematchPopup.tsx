// components/game/RematchTopPopup.tsx — Styled matching Image 5 with XOET Brand Colors
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useAuth } from "../../context/authContext";
import { playTickSound } from "../../lib/pinTickAudio";
import { haptics } from "../../lib/haptcs";

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
  const { t } = useAuth();
  const y = useRef(new Animated.Value(-80)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      try {
        playTickSound(700);
      } catch {}

      Animated.parallel([
        Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web', easing: Easing.out(Easing.cubic) }),
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: -80, duration: 180, useNativeDriver: Platform.OS !== 'web', easing: Easing.in(Easing.cubic) }),
        Animated.timing(op, { toValue: 0, duration: 140, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [visible, y, op]);

  // Auto-decline after 60 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDecline();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDecline]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.wrap, { opacity: op, transform: [{ translateY: y }] }]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="flame" size={18} color="#f5b642" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1}>
              {fromName} {t("wants_rematch")}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {t("stake_label")}: <Text style={{ color: '#00daf3', fontWeight: '900' }}>ETB {amount}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              haptics.tap();
              playTickSound();
              onDecline();
            }}
            style={[styles.btn, styles.decline]}
          >
            <Text style={styles.declineText}>{t("nah_skip")}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.confirm();
              playTickSound(800);
              onAccept();
            }}
            style={[styles.btn, styles.accept]}
          >
            <Ionicons name="flash" size={14} color="#060a14" />
            <Text style={styles.acceptText}>{t("lets_go")}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: Platform.OS === 'web' ? 24 : 48,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "rgba(0, 218, 243, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#111625",
    shadowColor: "#00daf3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(245, 182, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  sub: {
    color: "#8b93a7",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 14,
    flex: 1,
  },
  decline: {
    backgroundColor: "#161c2e",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  declineText: {
    color: "#8b93a7",
    fontWeight: "700",
    fontSize: 13,
  },
  accept: {
    backgroundColor: "#00daf3",
    shadowColor: "#00daf3",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptText: {
    color: "#060a14",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
