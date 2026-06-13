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
    top: 50,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#E5E7EB",
    fontWeight: "900",
    fontSize: 15,
  },
  sub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600'
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
  },
  decline: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  accept: {
    backgroundColor: "#00E5FF",
    shadowColor: "#00E5FF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
