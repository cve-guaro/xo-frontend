import { useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { EASE } from "./easing";
import { DUR, PRESS } from "./tokens";
import { useReducedMotion } from "./useReducedMotion";

const NATIVE = Platform.OS !== "web"; // same rule your codebase already uses
const APressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** In-app "Reduce motion" switch, combined with the OS setting. */
  reduceMotion?: boolean;
  /** Optional haptic tick, e.g. () => Haptics.selectionAsync(). Runs on press-in. */
  onPressFeedback?: () => void;
}

/**
 * Press feedback for buttons, cards and rows.
 * Normal: 2% shrink in 100ms (ease-out), back in 150ms (ease-in). Only transform and opacity.
 * Reduced motion: no scale at all; a 100ms dim instead, so the press is still visible.
 */
export function PressableScale({
  children,
  style,
  reduceMotion,
  onPressFeedback,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole,
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion(reduceMotion);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const run = (pressed: boolean) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: pressed && !reduced ? PRESS.scale : 1,
        duration: pressed ? DUR.micro : DUR.fast,
        easing: pressed ? EASE.out : EASE.in,
        useNativeDriver: NATIVE,
      }),
      Animated.timing(opacity, {
        toValue: pressed && reduced ? PRESS.reducedOpacity : 1,
        duration: DUR.micro,
        easing: EASE.inOut,
        useNativeDriver: NATIVE,
      }),
    ]).start();
  };

  return (
    <APressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      onPressIn={(e: GestureResponderEvent) => {
        run(true);
        onPressFeedback?.();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        run(false);
        onPressOut?.(e);
      }}
      style={[style, { opacity, transform: [{ scale }] }]}
    >
      {children}
    </APressable>
  );
}
