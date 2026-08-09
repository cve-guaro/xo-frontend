// components/game/LiveWinToast.tsx
// Animated live activity notification banner ("🔥 LIVE Abel won ETB 2,500")
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface LiveWinToastProps {
  message?: string | null;
}

export const LiveWinToast: React.FC<LiveWinToastProps> = ({ message }) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      slideAnim.setValue(30);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 16,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [message, opacityAnim, slideAnim]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(20, 16, 42, 0.95)", "rgba(12, 10, 26, 0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.toastGradient}
      >
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>🔥 LIVE</Text>
        </View>
        <Text style={styles.messageText} numberOfLines={1}>
          {message}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: "rgba(239, 68, 68, 0.35)",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  toastGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
  },
  liveBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  liveBadgeText: {
    color: "#ef4444",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
});
