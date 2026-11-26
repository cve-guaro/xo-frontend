// hooks/useSidebarCollapse.ts
// XO ET — Persistent Desktop Sidebar Collapse State
// Ensures sidebar collapse state follows seamlessly across every page in the platform.
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@xoet_desktop_sidebar_collapsed";

// Module-level global state for instantaneous zero-latency sync across routes
let globalCollapsed: boolean = false;
let isInitialized: boolean = false;
const listeners = new Set<(val: boolean) => void>();

// Synchronous check on web to eliminate any flash of expanded sidebar
if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      globalCollapsed = saved === "true";
      isInitialized = true;
    }
  } catch {}
}

export function useSidebarCollapse() {
  const [collapsed, setCollapsedState] = useState<boolean>(globalCollapsed);

  useEffect(() => {
    const handleChange = (val: boolean) => {
      setCollapsedState(val);
    };
    listeners.add(handleChange);

    if (!isInitialized) {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((val) => {
          if (val !== null) {
            const parsed = val === "true";
            globalCollapsed = parsed;
            isInitialized = true;
            listeners.forEach((fn) => fn(parsed));
          }
        })
        .catch(() => {});
    }

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const setCollapsed = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(globalCollapsed) : val;
    globalCollapsed = nextVal;
    listeners.forEach((fn) => fn(nextVal));

    AsyncStorage.setItem(STORAGE_KEY, String(nextVal)).catch(() => {});
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(nextVal));
      } catch {}
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!globalCollapsed);
  }, [setCollapsed]);

  return {
    isCollapsed: collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
