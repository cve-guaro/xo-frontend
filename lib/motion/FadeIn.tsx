import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Platform, type StyleProp, type ViewStyle } from "react-native";
import { EASE } from "./easing";
import { DUR, staggerDelay } from "./tokens";
import { useReducedMotion } from "./useReducedMotion";

const NATIVE = Platform.OS !== "web";

export interface FadeInProps {
  children: ReactNode;
  /** Position in a short list, for the stagger. */
  index?: number;
  /** Total items in the list (lists over 10 are not staggered). */
  count?: number;
  style?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
}

/**
 * Opacity-only entrance, 150ms ease-out, stagger = min(i * 30ms, 200ms).
 * Reduced motion: a 100ms fade with no stagger. Use for the first paint of a short list;
 * do not use for filter or search updates.
 */
export function FadeIn({ children, index = 0, count = 1, style, reduceMotion }: FadeInProps) {
  const reduced = useReducedMotion(reduceMotion);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: reduced ? DUR.micro : DUR.fast,
      delay: reduced ? 0 : staggerDelay(index, count),
      easing: EASE.out,
      useNativeDriver: NATIVE,
    }).start();
  }, [opacity, reduced, index, count]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
