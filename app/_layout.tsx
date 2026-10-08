// app/_layout.tsx
import { Platform } from "react-native";

// ✅ @sentry/react is browser-only — deferred and code-split so it doesn't block initial render or inflate bundle sizes.
if (Platform.OS === "web") {
  setTimeout(() => {
    import("@sentry/react")
      .then((SentryModule) => {
        const Sentry = typeof SentryModule.init === 'function'
          ? SentryModule
          : (SentryModule.default || SentryModule);
        if (typeof Sentry.init === 'function') {
          Sentry.init({
            dsn: "https://0542c52f966517870c71abc882d89ca6@o4511351046733824.ingest.us.sentry.io/4511351146872832",
            tracesSampleRate: 0.1,
          });
        } else {
          console.warn("[Sentry] init function not found on imported module:", Object.keys(SentryModule));
        }
      })
      .catch((e) => {
        console.warn("[Sentry] Failed to initialize dynamically:", e);
      });
  }, 0);
}

import { Redirect, Slot, useRootNavigationState, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { PropsWithChildren, memo, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  LogBox,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth, GlobalUIComponents } from "../context/authContext";
import { LinearGradient } from "expo-linear-gradient";
import { BackgroundMusicProvider, useBackgroundMusic } from "../context/BackgroundMusicProvider";
import { SparklesIcon } from "../components/SvgIcons";
import { ToastProvider } from "../context/ToastContext";
import GlobalToastContainer from "../components/GlobalToast";
import { PwaInstallBanner } from "../components/PwaInstallBanner";
import { FeatureProvider } from "../context/FeatureContext";
import { FeatureGate } from "../components/FeatureGate";
import { SmoothScroll } from "../components/SmoothScroll";


// ✅ Suppress known-safe React Native Web deprecation warnings in browser console.
// LogBox only filters the in-app overlay; patching console.warn/error is needed for DevTools.
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const _warn = console.warn.bind(console);
  const _error = console.error.bind(console);
  const SUPPRESSED = [
    '"shadow',
    '"textShadow',
    'props.pointerEvents',
    'Invalid style property of "outline"',
    'style.resizeMode is deprecated',
    'pointerEvents is deprecated',
    'Unexpected text node',
    'useNativeDriver',
  ];
  const isSuppressed = (msg: string) => SUPPRESSED.some(s => String(msg).includes(s));
  console.warn = (...args: any[]) => { if (!isSuppressed(args[0])) _warn(...args); };
  console.error = (...args: any[]) => { if (!isSuppressed(args[0])) _error(...args); };
}

// ✅ Handle chunk loading / dynamic import errors gracefully (e.g. after new deployments)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const isChunkError = (error: any) => {
    if (!error) return false;
    const msg = String(error.message || error);
    const name = String(error.name || '');
    return (
      name === 'AsyncRequireError' ||
      name === 'ChunkLoadError' ||
      msg.includes('Loading module') ||
      msg.includes('Loading chunk') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('Failed to load resource')
    );
  };

  const reloadWithLock = () => {
    try {
      const now = Date.now();
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      if (lastReload && now - Number(lastReload) < 10000) {
        console.error('[RootLayout] Prevented infinite reload loop for dynamic import error.');
        return;
      }
      sessionStorage.setItem('last_chunk_reload', String(now));
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  window.addEventListener('error', (event) => {
    if (isChunkError(event.error) || isChunkError(event.message)) {
      console.warn('[RootLayout] Dynamic import error detected. Reloading page...');
      reloadWithLock();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkError(event.reason)) {
      console.warn('[RootLayout] Promise rejection from dynamic import detected. Reloading page...');
      reloadWithLock();
    }
  });
}



function AuthGate({ children }: PropsWithChildren) {
  const segments = useSegments();
  const navReady = useRootNavigationState()?.key != null;
  const { user, booting } = useAuth();

  const { unlockAudio } = useBackgroundMusic();

  // ✅ show silky loader while nav/auth are not ready
  if (!navReady || (booting && !user)) {
    return (
      <Pressable 
        onPress={() => {
          console.log('[AUDIO] Interaction on BootSplash detected');
          unlockAudio();
        }} 
        style={{ flex: 1, cursor: Platform.OS === 'web' ? 'pointer' : 'auto' } as any}
      >
        <BootSplash status={!navReady ? "Preparing..." : "Loading..."} />
      </Pressable>
    );
  }

  const inAuth = segments[0] === "(auth)";
  const inAuthed = segments[0] === "(authed)";

  if (!user && inAuthed) return <Redirect href="/(auth)/login" />;
  if (user && inAuth) return <Redirect href="/(authed)/home/gameplay" />;

  return <>{children}</>;
}

// Capture PWA install prompt globally to prevent timing issues
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
  });
}

function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "XO Ethiopia - Play Tic-Tac-Toe for Real Money";
    }

    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
          .then((registration) => {
            // Force check for updates immediately
            registration.update().catch(() => {});
            // When a new SW is waiting, activate it immediately
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    // New SW activated — reload to get fresh assets
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error('ServiceWorker registration failed: ', err);
          });
      });
    }
  }, []);

  return (
    <AuthProvider>
      <FeatureProvider>
        <BackgroundMusicProvider>
          <ToastProvider>
            <SmoothScroll>
              <SafeAreaProvider style={{ flex: 1, ...(Platform.OS === 'web' ? { height: '100vh', width: '100vw' } : {}) } as any}>
                <StatusBar style="light" />
                <AuthGate>
                  <FeatureGate>
                    <Slot />
                    <GlobalUIComponents />
                    <GlobalToastContainer />
                    {Platform.OS === 'web' && <PwaInstallBanner />}
                  </FeatureGate>
                </AuthGate>
              </SafeAreaProvider>
            </SmoothScroll>
          </ToastProvider>
        </BackgroundMusicProvider>
      </FeatureProvider>
    </AuthProvider>
  );
}

export default RootLayout;

/* ----------------------------- Silky Boot Splash ---------------------------- */

const BootSplash = memo(function BootSplash({ status }: { status: string }) {
  const { width } = Dimensions.get("window");

  // super light animations (native driver)
  const fade = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(10)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(floatY, { toValue: 0, speed: 16, bounciness: 6, useNativeDriver: Platform.OS !== 'web' }),
    ]);

    const looping = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );

    intro.start(() => looping.start());

    return () => {
      fade.stopAnimation();
      floatY.stopAnimation();
      pulse.stopAnimation();
    };
  }, [fade, floatY, pulse]);

  const ringScale = useMemo(
    () =>
      pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1.03],
      }),
    [pulse]
  );

  const ringOpacity = useMemo(
    () =>
      pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.6],
      }),
    [pulse]
  );

  return (
    <View style={styles.bootRoot}>
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ scale: ringScale }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Soft breathing glow behind the logo */}
        <Animated.View
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "#00daf3",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.3],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.25],
                }),
              },
            ],
          }}
        />

        {/* Clean rounded logo frame */}
        <View style={styles.logoFrame}>
          <Image 
            source={require("../assets/images/icon.jpg")} 
            style={styles.logo} 
            // @ts-ignore
            {...(Platform.OS === 'web' ? { fetchPriority: "high" } : {})}
          />
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  bootRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#04040a",
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0c0c16",
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.4)",
    shadowColor: "#00daf3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});
