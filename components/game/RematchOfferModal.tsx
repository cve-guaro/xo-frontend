import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebPressable } from "../WebPressable";
import { haptics } from "../../lib/haptcs";

export interface RematchOfferModalProps {
  visible: boolean;
  fromName?: string;
  amount?: number;
  onAccept: () => void;
  onDecline: () => void;
}

export const RematchOfferModal: React.FC<RematchOfferModalProps> = ({
  visible,
  fromName,
  amount,
  onAccept,
  onDecline,
}) => {
  const [countdown, setCountdown] = useState(10);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
      setCountdown(10);
      return;
    }
    // Slide in from top
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start();

    // 10s countdown
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const isUrgent = countdown <= 3;
  const accentColor = isUrgent ? "#ef4444" : "#00DAF3";

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Ionicons name="game-controller" size={24} color="#00DAF3" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText}>
              {fromName || "Opponent"} wants a rematch!
            </Text>
            <Text style={styles.subtitleText}>
              Same stake: <Text style={styles.amountText}>ETB {Number(amount || 0).toLocaleString()}</Text>
            </Text>
          </View>

          {/* Countdown Ring */}
          <View
            style={[
              styles.timerRing,
              {
                borderColor: accentColor,
                backgroundColor: isUrgent ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 218, 243, 0.12)",
              },
            ]}
          >
            <Text style={[styles.timerText, { color: accentColor }]}>
              {countdown}
            </Text>
          </View>
        </View>

        {/* Action buttons with consistent DESIGN.md styling & haptics */}
        <View style={styles.buttonRow}>
          <WebPressable
            onPress={() => {
              haptics.impact();
              onDecline();
            }}
            activeScale={0.96}
            style={styles.declineBtn}
          >
            <Text style={styles.declineText}>Decline</Text>
          </WebPressable>

          <WebPressable
            onPress={() => {
              haptics.impact();
              onAccept();
            }}
            activeScale={0.96}
            style={styles.acceptBtn}
          >
            <Ionicons name="flash" size={17} color="#080c18" />
            <Text style={styles.acceptText}>Let's Go!</Text>
          </WebPressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 7, 18, 0.8)",
  },
  container: {
    width: "92%",
    maxWidth: 460,
    backgroundColor: "#0c142e",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.35)",
    shadowColor: "#00DAF3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  subtitleText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  amountText: {
    color: "#00DAF3",
    fontWeight: "900",
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  timerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: {
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  acceptBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#00DAF3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#00DAF3",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  acceptText: {
    color: "#080c18",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.5,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
});

export default RematchOfferModal;
