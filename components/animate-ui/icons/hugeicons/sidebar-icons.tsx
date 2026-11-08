// components/animate-ui/icons/hugeicons/sidebar-icons.tsx
// ────────────────────────────────────────────────────────────────────────────
// Animate UI: Hugeicons collection for Desktop Navigation & Sidebars.
// Features clean modern geometry, customizable colors, solid/outline modes,
// and animateOnHover micro-interactions. Compatible with React Native Web & Native.
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";

export interface HugeiconProps {
  size?: number;
  color?: string;
  solid?: boolean;
  animateOnHover?: boolean;
  style?: any;
}

// ── 1. HOME 01 (Modern geometric house) ──────────────────────────────────────
export const Home01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    Animated.spring(scaleAnim, { toValue: 1.14, friction: 5, tension: 80, useNativeDriver: Platform.OS !== "web" }).start();
  };

  const handleHoverOut = () => {
    if (!animateOnHover) return;
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: Platform.OS !== "web" }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
      onMouseLeave={handleHoverOut}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M2.5 10.5L12 3L21.5 10.5V20C21.5 20.5523 21.0523 21 20.5 21H15.5C14.9477 21 14.5 20.5523 14.5 20V15.5C14.5 14.9477 14.0523 14.5 13.5 14.5H10.5C9.94772 14.5 9.5 14.9477 9.5 15.5V20C9.5 20.5523 9.05228 21 8.5 21H3.5C2.94772 21 2.5 20.5523 2.5 20V10.5Z"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {solid && (
          <Path
            d="M9.5 21V15.5C9.5 14.9477 9.94772 14.5 10.5 14.5H13.5C14.0523 14.5 14.5 14.9477 14.5 15.5V21"
            fill="#0091EA"
          />
        )}
      </Svg>
    </Animated.View>
  );
};

// ── 2. TIME 01 (Modern clock timer) ──────────────────────────────────────────
export const Time01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== "web" }).start();
  };

  const spinDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{ transform: [{ rotate: spinDeg }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="12"
          cy="12"
          r="9"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <Path
          d="M12 7V12L15.5 14"
          stroke={solid ? "#0091EA" : color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

// ── 3. TROPHY 01 (Modern tournament trophy) ──────────────────────────────────
export const Trophy01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -4, duration: 90, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(bounceAnim, { toValue: 2, duration: 80, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 80, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ translateY: bounceAnim }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 4H18V10C18 13.3137 15.3137 16 12 16C8.68629 16 6 13.3137 6 10V4Z"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M6 6H3C2.44772 6 2 6.44772 2 7V8C2 9.65685 3.34315 11 5 11H6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M18 6H21C21.5523 6 22 6.44772 22 7V8C22 9.65685 20.6569 11 19 11H18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12 16V19M8 21H16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
};

// ── 4. WALLET 01 (Modern financial card / wallet) ────────────────────────────
export const Wallet01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    Animated.spring(scaleAnim, { toValue: 1.12, friction: 5, tension: 80, useNativeDriver: Platform.OS !== "web" }).start();
  };

  const handleHoverOut = () => {
    if (!animateOnHover) return;
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: Platform.OS !== "web" }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
      onMouseLeave={handleHoverOut}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 7V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V7C3 5.34315 4.34315 4 6 4H18C19.6569 4 21 5.34315 21 7Z"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M3 8.5H21" stroke={solid ? "#0091EA" : color} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx="16.5" cy="14.5" r="1.5" fill={solid ? "#0091EA" : color} />
      </Svg>
    </Animated.View>
  );
};

// ── 5. USER 01 (Modern geometric player avatar) ──────────────────────────────
export const User01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const tiltAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    Animated.sequence([
      Animated.timing(tiltAnim, { toValue: -8, duration: 80, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(tiltAnim, { toValue: 8, duration: 90, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(tiltAnim, { toValue: 0, duration: 80, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  };

  const tiltDeg = tiltAnim.interpolate({
    inputRange: [-20, 20],
    outputRange: ["-20deg", "20deg"],
  });

  return (
    <Animated.View
      style={{ transform: [{ rotate: tiltDeg }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="12"
          cy="7"
          r="4"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4 19C4 16.2386 7.58172 14 12 14C16.4183 14 20 16.2386 20 19"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

// ── 6. SHIELD 01 (Modern angular admin badge) ────────────────────────────────
export const Shield01: React.FC<HugeiconProps> = ({ size = 20, color = "#FFFFFF", solid = false, animateOnHover = true }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (!animateOnHover) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 100, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: pulseAnim }] }}
      // @ts-ignore
      onMouseEnter={handleHoverIn}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L4 5.5V11.5C4 16.5 7.5 20.8 12 22C16.5 20.8 20 16.5 20 11.5V5.5L12 2Z"
          fill={solid ? color : "none"}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M9 12L11 14L15 10"
          stroke={solid ? "#0091EA" : color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};
