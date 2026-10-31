import { useState } from "react";
import { Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { pillMetrics } from "./pillMath";

export interface SlidingPillProps {
  /** Horizontal scroll offset of the paged carousel. One source of truth for tabs, cards and dots. */
  scrollX: Animated.Value;
  /** Scroll distance between two pages (your `cardInterval`). */
  pageInterval: number;
  /** Number of tabs / pages. */
  count: number;
  /** Gap between the pill and the tab bar edge. */
  inset?: number;
  /** Pill look: backgroundColor, borderRadius, border. Position and size are handled here. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Active-tab indicator that moves exactly as far as the carousel has scrolled.
 * No timers, no durations: motion is a pure function of scroll, so it follows the finger and stays
 * in sync with the cards. Only `transform` animates.
 * Render it BEHIND the tab labels, inside the tab bar container.
 * For tab taps, call scrollTo({ animated: !reducedMotion }).
 */
export function SlidingPill({ scrollX, pageInterval, count, inset = 4, style }: SlidingPillProps) {
  const [width, setWidth] = useState(0);
  const { slot, travel } = pillMetrics(width, count, inset);
  const canMove = count > 1 && pageInterval > 0 && width > 0;

  const translateX = canMove
    ? scrollX.interpolate({
        inputRange: [0, pageInterval * (count - 1)],
        outputRange: [0, travel],
        extrapolate: "clamp",
      })
    : 0;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Animated.View
          style={[
            { position: "absolute", top: inset, bottom: inset, left: inset, width: slot, transform: [{ translateX }] },
            style,
          ]}
        />
      )}
    </View>
  );
}
