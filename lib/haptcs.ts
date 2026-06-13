// src/lib/haptics.ts
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Haptics helper for Expo (expo-haptics)
 * - Safe no-op on unsupported devices (or simulators)
 * - Keep calls tiny and consistent across the app
 *
 * Usage:
 *   import { haptics } from "../src/lib/haptics";
 *   haptics.tap();
 *   haptics.success();
 *   haptics.impact("heavy");
 */

type Impact = "light" | "medium" | "heavy";
type Notification = "success" | "warning" | "error";
type Selection = "default" | "soft";

const isWeb = Platform.OS === "web";

/** Wrapper that never throws (important for UI interactions) */
async function safe<T>(fn: () => Promise<T> | T): Promise<void> {
  try {
    if (isWeb) return; // no haptics on web
    await fn();
  } catch {
    // ignore (simulator, unsupported device, permissions, etc.)
  }
}

const impactStyleMap: Record<Impact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationTypeMap: Record<Notification, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export const haptics = {
  // ---- common UX patterns ----

  /** Small "button pressed" */
  tap: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** For subtle toggles / segmented controls */
  select: () => safe(() => Haptics.selectionAsync()),

  /** Slightly stronger than tap */
  confirm: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Strong physical event (e.g., win, big action) */
  heavy: () =>
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Success / Warning / Error (OS-native feel) */
  success: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  // ---- configurable ----

  impact: (strength: Impact = "light") =>
    safe(() => Haptics.impactAsync(impactStyleMap[strength])),

  notify: (type: Notification) =>
    safe(() => Haptics.notificationAsync(notificationTypeMap[type])),

  /**
   * "Selection" haptic, with a tiny "soft" option:
   * - default: standard selectionAsync
   * - soft: very light impact (nice when selectionAsync feels too sharp on some devices)
   */
  selection: (variant: Selection = "default") =>
    safe(() =>
      variant === "soft"
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.selectionAsync()
    ),

  // ---- patterns / combos ----

  /** Nice for "like/favorite" */
  like: async () => {
    await safe(() => Haptics.selectionAsync());
    await sleep(40);
    await safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** Nice for "long press -> menu opened" */
  longPress: async () => {
    await safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await sleep(40);
    await safe(() => Haptics.selectionAsync());
  },

  /** For "payment complete" / "joined room" */
  celebrate: async () => {
    await safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await sleep(70);
    await safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** For "failed action" (e.g., insufficient balance) */
  reject: async () => {
    await safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    await sleep(60);
    await safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  // ---- escape hatch ----
  /**
   * Fully custom pattern runner.
   * Example:
   *   haptics.run([{ kind: "impact", strength: "light" }, { delay: 40 }, { kind: "select" }])
   */
  run: async (steps: HapticStep[]) => {
    for (const step of steps) {
      if ("delay" in step) {
        await sleep(step.delay);
        continue;
      }
      if (step.kind === "impact") {
        await haptics.impact(step.strength);
      } else if (step.kind === "select") {
        await haptics.selection(step.variant);
      } else if (step.kind === "notify") {
        await haptics.notify(step.type);
      }
    }
  },
} as const;

// ---------- types ----------
type HapticStep =
  | { delay: number }
  | { kind: "impact"; strength: Impact }
  | { kind: "select"; variant?: Selection }
  | { kind: "notify"; type: Notification };

// ---------- utils ----------
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
