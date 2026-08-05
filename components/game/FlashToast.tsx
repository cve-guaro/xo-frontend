import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { haptics } from "../../lib/haptcs";

export type MatchFoundToastHandle = {
  show: (
    override?: Partial<{
      amount: number;
      seconds: number;
      opponentName?: string;
      message?: string;
    }>
  ) => void;
};

type Props = {
  amount: number;
  seconds?: number;
  opponentName?: string;
  durationMs?: number;
  message?: string;
};

const DEFAULT_DURATION = 2000;

type Payload = {
  amount: number;
  seconds: number;
  opponentName?: string;
  message?: string;
};

const MatchFoundToast = React.forwardRef<MatchFoundToastHandle, Props>(
  ({ amount, seconds = 2, opponentName, durationMs = DEFAULT_DURATION, message = "Match found!" }, ref) => {
    const [visible, setVisible] = useState(false);
    const [payload, setPayload] = useState<Payload>({
      amount,
      seconds,
      opponentName,
      message,
    });

    // One anim value is enough (smaller JS + fewer Animated nodes)
    const a = useRef(new Animated.Value(0)).current;

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
        a.stopAnimation();
      };
    }, [a]);

    const show = useCallback(
      (override?: Partial<Payload>) => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }

        setPayload({
          amount: override?.amount ?? amount,
          seconds: override?.seconds ?? seconds,
          opponentName: override?.opponentName ?? opponentName,
          message: override?.message ?? message,
        });

        // reset + open
        a.stopAnimation();
        a.setValue(0);
        setVisible(true);

        // haptics only when actually showing
        haptics.heavy?.();

        Animated.spring(a, {
          toValue: 1,
          tension: 160,
          friction: 14,
          useNativeDriver: true,
        }).start();

        hideTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          Animated.timing(a, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
            if (!mountedRef.current) return;
            setVisible(false);
          });
        }, durationMs);
      },
      [amount, seconds, opponentName, durationMs, message, a]
    );

    useImperativeHandle(ref, () => ({ show }), [show]);

    if (!visible) return null;

    const amt = Number(payload.amount || 0);
    const secs = Math.max(0, Number(payload.seconds || 0));

    // derive transforms from ONE value (cheap)
    const opacity = a;
    const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
    const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

    return (
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
        <View style={[styles.overlay, Platform.OS === 'web' && { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' } as any]}>
          <Animated.View style={[styles.cardShadow, { opacity, transform: [{ translateY }, { scale }] }]}>
            <View style={styles.cardWrap}>
              {/* Keep your look, but remove extra overlays/strokes to cut draw cost */}
              <LinearGradient
                colors={["rgba(124,58,237,0.96)", "rgba(79,70,229,0.92)", "rgba(10,12,28,0.92)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Icon */}
                <View style={styles.iconWrap}>
                  <View style={styles.iconRing}>
                    <LinearGradient
                      colors={["rgba(255,215,0,0.98)", "rgba(255,237,78,0.86)", "rgba(255,255,255,0.10)"]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.iconCore}>
                      <Ionicons name="sparkles-outline" size={22} color="rgba(255,255,255,0.95)" />
                    </View>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <Text style={styles.title}>{payload.message || "Match found!"}</Text>
                  <Text style={[styles.title, { color: "#4ade80", fontSize: 16, marginTop: 4 }]}>
                    Good luck!
                  </Text>

                  {!!payload.opponentName && (
                    <View style={styles.vsPill}>
                      <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.vsText} numberOfLines={1}>
                        vs {payload.opponentName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.row}>
                    <View style={[styles.pill, styles.pillBet]}>
                      <Ionicons name="wallet-outline" size={12} color="rgba(0,0,0,0.82)" />
                      <Text style={[styles.pillText, styles.pillTextDark]} numberOfLines={1}>
                        ETB {amt.toLocaleString()}
                      </Text>
                    </View>

                    <View style={[styles.pill, styles.pillTime]}>
                      <Ionicons name="timer-outline" size={12} color="rgba(255,255,255,0.92)" />
                      <Text style={styles.pillText} numberOfLines={1}>
                        Starts in {secs}s
                      </Text>
                    </View>
                  </View>
                </View>

                {/* cheap decor (kept, no extra gradients) */}
                <View style={styles.decorTop} />
                <View style={styles.decorBottom} />
                <View style={styles.sparkDot} />
              </LinearGradient>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

export default MatchFoundToast;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(0,0,0,0.65)",
    zIndex: 999999,
  },

  cardShadow: {
    width: "88%",
    maxWidth: 340,
    alignSelf: "center",
    marginHorizontal: "auto",
    borderRadius: 26,
    overflow: "visible",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.25 : 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  cardWrap: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  card: {
    padding: 18,
    borderRadius: 26,
    minHeight: 176,
  },

  iconWrap: { alignItems: "center", marginTop: 2, marginBottom: 12 },

  iconRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#FFD700",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconCore: {
    flex: 1,
    margin: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  content: { alignItems: "center" },

  title: {
    color: "rgba(255,255,255,0.97)",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
  },

  vsPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    maxWidth: 270,
  },
  vsText: { color: "rgba(255,255,255,0.90)", fontWeight: "800", fontSize: 12 },

  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },

  pillBet: {
    backgroundColor: "rgba(255,215,0,0.92)",
    borderColor: "rgba(255,255,255,0.20)",
  },
  pillTime: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.16)",
  },

  pillText: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 12 },
  pillTextDark: { color: "rgba(30,18,0,0.92)" },

  decorTop: {
    position: "absolute",
    top: -26,
    right: -26,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  decorBottom: {
    position: "absolute",
    bottom: -34,
    left: -34,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sparkDot: {
    position: "absolute",
    top: 18,
    left: 22,
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.85)",
    opacity: 0.45,
  },
});
