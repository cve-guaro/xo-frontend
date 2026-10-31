// components/animate-ui/icons/hugeicons/notification-01.tsx
// ────────────────────────────────────────────────────────────────────────────
// Animate UI: Hugeicons Notification 01 with animateOnHover swinging motion.
// Compatible with both React Native Web and Native platforms.
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from "react";
import { Animated, Platform, Pressable, View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface Notification01Props {
  size?: number;
  color?: string;
  animateOnHover?: boolean;
  style?: any;
  hasUnread?: boolean;
  unreadCount?: number;
  onPress?: () => void;
}

export const Notification01: React.FC<Notification01Props> = ({
  size = 22,
  color = "#FFFFFF",
  animateOnHover = true,
  style,
  hasUnread = false,
  unreadCount = 0,
  onPress,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const triggerAnimation = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    rotateAnim.setValue(0);

    Animated.sequence([
      Animated.timing(rotateAnim, { toValue: -14, duration: 70, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(rotateAnim, { toValue: 14, duration: 80, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(rotateAnim, { toValue: -10, duration: 80, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(rotateAnim, { toValue: 8, duration: 70, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(rotateAnim, { toValue: -4, duration: 60, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      isAnimating.current = false;
    });
  };

  const spinDeg = rotateAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ["-180deg", "180deg"],
  });

  return (
    <Pressable
      onPress={() => {
        triggerAnimation();
        onPress?.();
      }}
      // @ts-ignore
      onHoverIn={() => {
        if (animateOnHover) triggerAnimation();
      }}
      style={[styles.container, style]}
    >
      <Animated.View style={{ transform: [{ rotate: spinDeg }], transformOrigin: "top center" } as any}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Bell Body */}
          <Path
            d="M12 2C10.8954 2 10 2.89543 10 4C7.79086 4 6 5.79086 6 8V11C6 12.8856 5.05719 14.609 3.5 15.6389V17H20.5V15.6389C18.9428 14.609 18 12.8856 18 11V8C18 5.79086 16.2091 4 14 4C14 2.89543 13.1046 2 12 2Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bell Clapper */}
          <Path
            d="M9.5 18C9.5 19.3807 10.6193 20.5 12 20.5C13.3807 20.5 14.5 19.3807 14.5 18"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* Unread badge dot */}
      {(hasUnread || unreadCount > 0) && (
        <View style={styles.unreadDot} />
      )}
    </Pressable>
  );
};

export const Notification01Icon = Notification01;
export default Notification01;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    cursor: "pointer",
  } as any,
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF1744",
    borderWidth: 1.5,
    borderColor: "#080F17",
  },
});
