import { useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { EASE } from "./easing";
import { DUR, OVERLAY_OFFSET } from "./tokens";
import { useReducedMotion } from "./useReducedMotion";

const NATIVE = Platform.OS !== "web";

/**
 * Enter/exit motion for dialogs, sheets, toasts and popovers. Replaces spring-overshoot entrances.
 *   enter: 200ms ease-out, opacity + 8px translateY
 *   exit:  150ms ease-in  (faster than enter)
 *   reduced motion: 100ms opacity only, no translate
 * Keep the overlay absolutely positioned so nothing else shifts, and handle the Android back button
 * immediately: never wait for the exit animation to finish.
 *
 * Usage: const { mounted, style } = useOverlayMotion(visible);
 *        if (!mounted) return null;  return <Animated.View style={style}>...</Animated.View>;
 */
export function useOverlayMotion(visible: boolean, reduceMotion?: boolean) {
  const reduced = useReducedMotion(reduceMotion);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? DUR.micro : visible ? DUR.base : DUR.fast,
      easing: visible ? EASE.out : EASE.in,
      useNativeDriver: NATIVE,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, reduced, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reduced ? 0 : OVERLAY_OFFSET, 0],
  });

  return { mounted, style: { opacity: progress, transform: [{ translateY }] } };
}
