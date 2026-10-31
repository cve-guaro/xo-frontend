import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * The OS "reduce motion" preference, kept live (it re-renders when the user changes it).
 * `appOverride` lets an in-app "Reduce motion" switch force it on, because not everyone can
 * find the OS setting.
 *
 * Note: Reanimated's own useReducedMotion returns the value at app start and does not re-render
 * on change, so this hook is the safer choice for chrome.
 */
export function useReducedMotion(appOverride = false): boolean {
  const [os, setOs] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setOs(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOs);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return appOverride || os;
}
