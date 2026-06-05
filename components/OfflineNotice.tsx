import { CloudOfflineIcon, WifiIcon, EllipseIcon, RefreshIcon } from "./SvgIcons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type OfflineNoticeProps = {
  onRetry: () => void;
  retryLabel?: string;
  message?: string;
  details?: string;
  tips?: string[];
  isRetrying?: boolean;
  lastChecked?: Date | string | null;
};

/**
 * Fancy offline/failed-connection component for Expo/React Native.
 * - Animated cloud + wifi icon
 * - Gradient card, subtle borders
 * - Retry button with progress state
 */
export default function OfflineNotice({
  onRetry,
  retryLabel = "Retry",
  message = "You're offline",
  details = "We couldn't reach the server. Check your connection and try again.",
  tips = ["Toggle airplane mode off", "Reconnect to Wi‑Fi or data", "Try again in a moment"],
  isRetrying = false,
  lastChecked = null,
}: OfflineNoticeProps) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [float, pulse]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={["#0B0B0F", "#0e0f15"]} style={StyleSheet.absoluteFillObject as any} />

      <View style={styles.center}>
        <LinearGradient colors={["#171923", "#121420"]} style={styles.card}>
          <View style={styles.iconWrap}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <CloudOfflineIcon size={38} color="#e5e7eb" />
            </Animated.View>
            <Animated.View style={[styles.wifiBadge, { transform: [{ scale }] }] }>
              <WifiIcon size={14} color="#ef4444" />
            </Animated.View>
          </View>

          <Text style={styles.title}>{message}</Text>
          <Text style={styles.subtitle}>{details}</Text>

          {!!tips?.length && (
            <View style={styles.tips}>
              {tips.slice(0, 3).map((t, i) => (
                <View key={i} style={styles.tipRow}>
                  <EllipseIcon size={6} color="#64748b" />
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {lastChecked && (
            <Text style={styles.meta}>Last checked: {lastChecked && !isNaN(new Date(lastChecked).getTime()) ? new Date(lastChecked).toLocaleTimeString() : '—'}</Text>
          )}

          <TouchableOpacity onPress={onRetry} disabled={isRetrying} style={[styles.cta, isRetrying && styles.ctaDisabled] }>
            <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.ctaInner}>
              {isRetrying ? (
                <ActivityIndicator color="#0c0c1f" />
              ) : (
                <>
                  <RefreshIcon size={18} color="#0c0c1f" />
                  <Text style={styles.ctaText}>{retryLabel}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 6 } }),
  },
  iconWrap: { alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 10 },
  wifiBadge: {
    position: "absolute",
    right: 112,
    top: 2,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 6 },
  subtitle: { color: "#94a3b8", textAlign: "center", marginTop: 6 },
  tips: { marginTop: 10, gap: 6 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { color: "#94a3b8" },
  meta: { color: "#64748b", textAlign: "center", marginTop: 8, fontSize: 12 },
  cta: { borderRadius: 14, overflow: "hidden", marginTop: 14 },
  ctaDisabled: { opacity: 0.6 },
  ctaInner: { paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  ctaText: { color: "#0c0c1f", fontSize: 15, fontWeight: "800" },
});
