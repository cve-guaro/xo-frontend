// components/game/RematchTopPopup.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useAuth } from "../../context/authContext";

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
      {/* Ultra transparent container */}
      {Platform.OS === 'web' ? (
        <View style={[styles.card, { backgroundColor: "rgba(16, 24, 40, 0.95)" }]}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="flame" size={16} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {fromName} {t("wants_rematch")}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {t("stake_label")}: <Text style={{ color: '#00daf3', fontWeight: '800' }}>ETB {amount}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onDecline} style={[styles.btn, styles.decline]}>
              <Text style={[styles.btnText, { color: "rgba(255,255,255,0.7)" }]}>{t("nah_skip")}</Text>
            </Pressable>

            <Pressable onPress={onAccept} style={[styles.btn, styles.accept]}>
              <Ionicons name="flash" size={14} color="#000" />
              <Text style={[styles.btnText, { color: "#000" }]}>{t("lets_go")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={["rgba(20, 24, 40, 0.98)", "rgba(12, 16, 28, 0.95)"]}
          style={styles.card}
        >
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="flame" size={16} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {fromName} {t("wants_rematch")}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {t("stake_label")}: <Text style={{ color: '#00daf3', fontWeight: '800' }}>ETB {amount}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onDecline} style={[styles.btn, styles.decline]}>
              <Text style={[styles.btnText, { color: "rgba(255,255,255,0.7)" }]}>{t("nah_skip")}</Text>
            </Pressable>

            <Pressable onPress={onAccept} style={[styles.btn, styles.accept]}>
              <Ionicons name="flash" size={14} color="#000" />
              <Text style={[styles.btnText, { color: "#000" }]}>{t("lets_go")}</Text>
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
    top: 36,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "94%",
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 255, 0.4)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: 'hidden',
    shadowColor: "#00e5ff",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  sub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 3,
    fontWeight: '700'
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
  },
  decline: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  accept: {
    backgroundColor: "#00E5FF",
    shadowColor: "#00E5FF",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
});
