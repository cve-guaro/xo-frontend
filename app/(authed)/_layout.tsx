import { SocketProvider, useSocket, useSocketActions, useSocketState } from "../../context/socketContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Slot, useRouter, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Platform, useWindowDimensions, Text, TouchableOpacity, Animated, Easing, StyleSheet, Image, Linking, Modal } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/authContext";
import { WebPressable } from "../../components/WebPressable";
import { haptics } from "../../lib/haptcs";
import { useBackgroundMusic } from "../../context/BackgroundMusicProvider";
import { API_URL } from "../../config";
import { useToast } from "../../context/ToastContext";

// Lazy load heavy components on web to optimize bundle size, evaluations, and TBT
const WebDepositModal = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/WebModals").then(m => ({ default: m.WebDepositModal })))
  : require("../../components/WebModals").WebDepositModal;

const WebWithdrawModal = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/WebModals").then(m => ({ default: m.WebWithdrawModal })))
  : require("../../components/WebModals").WebWithdrawModal;

const BonusLogsModal = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/BonusLogsModal"))
  : require("../../components/BonusLogsModal").default;

const LogoutConfirmation = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/LogoutConfirmation"))
  : require("../../components/LogoutConfirmation").default;

const WelcomeBonusModal = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/WelcomeBonusModal"))
  : require("../../components/WelcomeBonusModal").default;

const NotificationsPopover = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/NotificationsPopover"))
  : require("../../components/NotificationsPopover").default;

const RematchTopPopup = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/game/RematchPopup"))
  : require("../../components/game/RematchPopup").default;

const IncomingInviteModal = Platform.OS === 'web'
  ? React.lazy(() => import("../../components/game/IncomingInviteModal"))
  : require("../../components/game/IncomingInviteModal").default;


const SidebarItem = ({ icon, label, isActive, onPress, badge, collapsed, isDesktop }: { icon: any; label: string; isActive: boolean; onPress: () => void; badge?: string; collapsed?: boolean; isDesktop?: boolean }) => {
  return (
    <WebPressable
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: collapsed ? 0 : 20,
          marginHorizontal: collapsed ? 0 : 12,
          borderRadius: 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
          backgroundColor: isActive
            ? 'rgba(0, 218, 243, 0.08)'
            : hovered
              ? 'rgba(255, 255, 255, 0.03)'
              : 'transparent',
          borderLeftWidth: isActive ? 3 : 0,
          borderLeftColor: isActive ? '#00daf3' : 'transparent',
          shadowColor: isActive ? '#00daf3' : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isActive ? 0.15 : 0,
          shadowRadius: 8,
          transition: 'all 0.15s ease-in-out',
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={isActive ? '#00daf3' : 'rgba(229,227,255,0.5)'} style={{ marginRight: collapsed ? 0 : 14 }} />
      {!collapsed && (
        <Text style={{
          color: isActive ? '#fff' : 'rgba(229,227,255,0.5)',
          fontSize: 14,
          fontWeight: isActive ? '800' : '600',
          letterSpacing: 0.3,
          flex: 1,
        }}>
          {label}
        </Text>
      )}
    </WebPressable>
  );
};

const HeaderButton = ({ icon, onPress, isActive, activeColor }: { icon: any; onPress: () => void; isActive?: boolean; activeColor?: string }) => (
  <WebPressable
    onPress={onPress}
    style={({ hovered }: { pressed: boolean; hovered: boolean }) => ({
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isActive ? (activeColor || 'rgba(0, 218, 243, 0.12)') : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
      borderWidth: 1,
      borderColor: isActive ? (activeColor ? activeColor.replace('0.15', '0.3') : 'rgba(0, 218, 243, 0.3)') : 'transparent',
      transform: [{ scale: hovered ? 1.08 : 1 }],
      transition: 'all 0.15s ease-in-out',
    })}
  >
    <Ionicons name={icon} size={18} color={isActive ? (activeColor?.includes('16,185') ? '#10b981' : '#00daf3') : 'rgba(167,167,210,0.7)'} />
  </WebPressable>
);

function MatchmakingGate() {
  const { onMessage } = useSocketActions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage((msg) => {
      if (msg?.type === "match_found") {
        const isAlreadyInRoom = pathname.includes("/game/room");
        if (!isAlreadyInRoom) {
          const { matchId, youAre, symbol, opponentUsername, opponentAvatar, betAmount, timerDuration } = msg.payload || {};
          console.log("[GLOBAL_GATE] Match found! Redirecting to room:", matchId);
          router.replace({
            pathname: "/game/room",
            params: {
              id: String(matchId),
              symbol: symbol || youAre || "X",
              vs: opponentUsername || "Opponent",
              oppId: msg.payload?.opponentId || "",
              opponentAvatar: opponentAvatar || "",
              amount: String(betAmount || 50),
              time: String(timerDuration || 30)
            }
          } as any);
        }
      }
    });
    return unsub;
  }, [onMessage, pathname, router]);

  return null;
}

function GlobalNotiGate() {
  const { onMessage, ensureConnected } = useSocketActions();
  const { success, info, warning, error: toastError } = useToast();
  const { refreshProfile, token } = useAuth();

  useEffect(() => {
    if (token) ensureConnected(token).catch(() => { });
  }, [token, ensureConnected]);

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage((msg) => {
      const { type, payload } = msg;

      if (type === "deposit_completed") {
        success("Deposit Success!", `Your deposit of ETB ${payload?.amount || ''} has been confirmed.`, 6000);
        refreshProfile?.();
      } else if (type === "withdraw_processed") {
        if (payload?.status === 'COMPLETED') {
          success("Withdrawal Complete", `ETB ${payload?.amount || ''} has been sent to your account.`);
        } else {
          info("Withdrawal Update", `Your withdrawal status: ${payload?.status || 'Processing'}`);
        }
        refreshProfile?.();
      } else if (type === "info") {
        info(payload?.title || "Notification", payload?.message || String(payload || ""));
      } else if (type === "balance_update") {
        refreshProfile?.();
      }
    });
    return unsub;
  }, [onMessage, success, info, refreshProfile]);

  return null;
}

function GlobalInvitesGate() {
  const { onMessage, send } = useSocketActions();
  const { isGameActive } = useSocketState();
  const { token } = useAuth();
  const pathname = usePathname();
  const [rematchOffer, setRematchOffer] = useState<{ visible: boolean; fromName?: string; amount?: number; fromUserId?: string } | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<any>(null);

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage((msg) => {
      // Ignore invites if the user is actually inside the game room (room.tsx handles it)
      if (pathname.includes('/game/room')) return;


      if (msg.type === 'rematch_offer') {
        setRematchOffer({
          visible: true,
          fromName: msg.payload?.fromUsername || 'Opponent',
          amount: msg.payload?.amount,
          fromUserId: msg.payload?.fromUserId,
        });
      } else if (msg.type === 'rematch_cancelled' || msg.type === 'match_started') {
        setRematchOffer(null);
      } else if (msg.type === 'friend_invite_received') {
        setIncomingInvite({
          id: msg.payload?.fromUserId,
          username: msg.payload?.fromUsername,
          amount: msg.payload?.betAmount,
        });
      } else if (msg.type === 'friend_invite_declined') {
        setIncomingInvite(null);
      }
    });
    return unsub;
  }, [onMessage, isGameActive, pathname]);

  const handleRematchAccept = useCallback(() => {
    if (!rematchOffer?.fromUserId || !token) return;
    send('rematch_response', { token, opponentId: rematchOffer.fromUserId, amount: rematchOffer.amount, accept: true });
    setRematchOffer(null);
  }, [rematchOffer, token, send]);

  const handleRematchDecline = useCallback(() => {
    if (!rematchOffer?.fromUserId || !token) return;
    send('rematch_response', { token, opponentId: rematchOffer.fromUserId, amount: rematchOffer.amount, accept: false });
    setRematchOffer(null);
  }, [rematchOffer, token, send]);

  const handleFriendAccept = useCallback(() => {
    if (!incomingInvite?.id || !token) return;
    send('friend_invite_response', { token, senderId: incomingInvite.id, accept: true, betAmount: incomingInvite.amount });
    setIncomingInvite(null);
  }, [incomingInvite, token, send]);

  const handleFriendDecline = useCallback(() => {
    if (!incomingInvite?.id || !token) return;
    send('friend_invite_response', { token, senderId: incomingInvite.id, accept: false, betAmount: incomingInvite.amount });
    setIncomingInvite(null);
  }, [incomingInvite, token, send]);

  // Auto-expire incoming friend invite after 45 seconds
  useEffect(() => {
    if (!incomingInvite) return;
    const timer = setTimeout(() => {
      // Auto-decline so the sender gets notified
      if (incomingInvite?.id && token) {
        send('friend_invite_response', { token, senderId: incomingInvite.id, accept: false, betAmount: incomingInvite.amount });
      }
      setIncomingInvite(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [incomingInvite, token, send]);

  // If they are on an active game page (room or gameplay), let the game view handle the popups.
  if (pathname.includes('/game/room') || pathname.includes('/home/gameplay') || pathname.includes('/home/spin')) return null;

  return (
    <>
      <RematchTopPopup visible={!!rematchOffer?.visible} fromName={rematchOffer?.fromName} amount={rematchOffer?.amount} onAccept={handleRematchAccept} onDecline={handleRematchDecline} />
      <IncomingInviteModal invite={incomingInvite} onAccept={handleFriendAccept} onDecline={handleFriendDecline} />
    </>
  );
}

export default function AuthedLayout() {
  const { user, token, logout, language, switchLanguage, t, refreshProfile, fixUrl } = useAuth();
  const toast = useToast();
  const { isPlaying, toggleMusic, unlockAudio } = useBackgroundMusic();
  const isEN = language === "en";
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isGameplayRoute = pathname.includes("/home/gameplay") || pathname === "/home";
  const isHistoryRoute = pathname.includes("/home/history") || pathname === "/games";
  const isLeaderboardRoute = pathname.includes("/home/leaderboard");
  const isAccountRoute = pathname.includes("/home/account");
  const isSpinRoute = pathname.includes("/home/spin");
  const isTransactionsRoute = pathname.includes("/home/transactions");
  const isAdminRoute = pathname.includes("/admin");
  const isGameRoute = pathname.includes("/game/");
  const showRightSidebar = isDesktop && !isGameplayRoute && !isHistoryRoute && !isLeaderboardRoute && !isAccountRoute && !isSpinRoute && !isAdminRoute && !isTransactionsRoute && !isGameRoute;
  const showLeftSidebar = (isDesktop || isTablet) && !isHistoryRoute && !isLeaderboardRoute && !isAccountRoute && !isSpinRoute && !isAdminRoute && !isTransactionsRoute && !isGameRoute;
  const isAccountPage = pathname.includes("/home/account");
  const isMissingProfile = user ? (!user.username || !user.display_name) : false;
  const isMobile = width < 768;
  const showResponsiveLayout = Platform.OS === 'web' && (isDesktop || isTablet);

  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [welcomeBonusVisible, setWelcomeBonusVisible] = React.useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // PWA Install state for desktop
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).deferredPrompt : null
  );
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const checkPwaInstalled = async () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone;
      if (isStandalone) return true;

      if ((navigator as any).getInstalledRelatedApps) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            return true;
          }
        } catch (e) {
          console.log('[PWA Layout] getInstalledRelatedApps error:', e);
        }
      }
      return false;
    };

    const handleCheck = () => {
      checkPwaInstalled().then(installed => {
        setIsPwaInstalled(installed);
      });
    };

    handleCheck();

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPwaInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    // Event listeners (appinstalled + mediaQuery change) fully cover install detection.
    // Removed: 3-second setInterval polling — was ~20 async calls/min for no benefit.

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const appPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!deferredPrompt) {
      appPulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(appPulseAnim, {
          toValue: 1.06,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(appPulseAnim, {
          toValue: 1.0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [deferredPrompt]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleReady = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-prompt-ready', handleReady);

    // Check if already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', handleReady);
    };
  }, []);

  const handleAppDownload = useCallback(async () => {
    haptics.selection("soft");

    const isTelegram = Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent);
    if (isTelegram) {
      setPwaModalVisible(true);
      return;
    }

    // Try PWA install prompt first (web only)
    if (Platform.OS === 'web' && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') (window as any).deferredPrompt = null;
      });
      return;
    }

    // Web fallback -> show beautiful instruction modal instead of redirecting directly to APK
    if (Platform.OS === 'web') {
      setPwaModalVisible(true);
      return;
    }

    // Fallback to APK download URL
    try {
      const url = 'https://xoethiopia.com/xoet.apk';
      await Linking.openURL(url);
    } catch (e) {
      Linking.openURL('https://xoethiopia.com').catch(() => { });
    }
  }, [deferredPrompt]);

  const tabSound = useAudioPlayer(require("../../assets/sounds/click.wav"));
  const [appConfig, setAppConfig] = React.useState<{ current_giveaway_version?: number; welcome_bonus_active?: boolean }>({});

  // Load Global App Config (Giveaway version, etc)
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/account/config`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && typeof data === 'object') setAppConfig(data);
        })
        .catch(err => console.log("[CONFIG] skip:", err.message));
    }
  }, [token]);

  // Web Audio Unlock on first interaction removed since expo-audio handles this natively.

  // Welcome Bonus Logic (Strictly for New Registrations + Session Gated)
  useEffect(() => {
    if (!user || isMissingProfile) return;

    const userVersion = (user as any)?.claimed_giveaway_version || 0;
    const globalVersion = appConfig.current_giveaway_version || 0;
    const isBonusActive = appConfig.welcome_bonus_active !== false;

    // Strict "Newness" check: only show to brand new players (first 24h)
    const isNewUser = (user as any)?.new_user === true;
    const createdAt = (user as any)?.created_at ? new Date((user as any).created_at).getTime() : 0;
    const isRecent = (Date.now() - createdAt) < 86400000; // 24 hours

    if (isBonusActive && userVersion < globalVersion && (isNewUser || isRecent)) {
      // Session Gate: ensure it only pops ONCE per active session
      if (Platform.OS === 'web') {
        if (sessionStorage.getItem('xoet_welcome_seen')) return;
      }

      const timer = setTimeout(() => {
        setWelcomeBonusVisible(true);
        if (Platform.OS === 'web') sessionStorage.setItem('xoet_welcome_seen', 'true');
      }, 2500); // Wait for dashboard to settle
      return () => clearTimeout(timer);
    }
  }, [user, isMissingProfile, appConfig]);

  const handleCloseWelcomeBonus = useCallback(async () => {
    setWelcomeBonusVisible(false);
    haptics.success();

    // Optimistically update local user state if possible, though refreshProfile is safer
    try {
      await fetch(`${API_URL}/account/welcome-seen`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      await refreshProfile?.();
    } catch (e) {
      console.error("[onboarding] failed to mark welcome bonus as seen:", e);
    }
  }, [token, refreshProfile]);

  const playTabSound = useCallback(() => {
    if (!isPlaying) return;
    tabSound.play();
  }, [isPlaying, tabSound]);

  const handleToggleSound = useCallback(() => {
    haptics.selection("soft");
    toggleMusic();
  }, [toggleMusic]);

  const handleLanguageToggle = useCallback(() => {
    haptics.selection("soft");
    switchLanguage();
  }, [switchLanguage]);

  const navigateTo = useCallback((path: string) => {
    playTabSound();
    router.push(path as any);
  }, [playTabSound, router]);

  if (!user) return <Redirect href="/(auth)/login" />;

  // ✅ Mandatory Onboarding: If user has no username/display_name, force them to account page
  if (isMissingProfile && !isAccountPage && !isAdminRoute) {
    return <Redirect href="/(authed)/home/account" />;
  }

  return (
    <SocketProvider token={token || undefined}>
      <MatchmakingGate />
      <GlobalNotiGate />
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />
      <View style={{ flex: 1, backgroundColor: '#0a0a14', padding: showResponsiveLayout && !isAdminRoute && !isGameplayRoute && !isHistoryRoute && !isLeaderboardRoute && !isAccountRoute && !isSpinRoute && !isTransactionsRoute ? 16 : 0 }}>
        {isAdminRoute || isGameplayRoute || isHistoryRoute || isLeaderboardRoute || isAccountRoute || isSpinRoute || isTransactionsRoute || isGameRoute ? (
          <Slot />
        ) : showResponsiveLayout ? (
          <View style={{ flex: 1, gap: 16 }}>
            {/* Top Header Panel Card */}
            <View style={{
              height: 72,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              backgroundColor: '#111115',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.05)',
            }}>
              {/* Left section: XO Logo and Brand text */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
                <Image source={require("../../assets/images/icon.jpg")} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#00daf3' }} />
                <Text style={{ fontSize: 24, fontWeight: '900', letterSpacing: 1, color: '#00daf3' }}>
                  XO ET
                </Text>
              </View>

              {/* Right section: Balance, utilities, PWA download, and profile */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Balance + Refresh button */}
                <View style={{ backgroundColor: '#18181b', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#27272a', marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="wallet" size={14} color="#00daf3" />
                    <Text style={{ fontWeight: '700', color: '#e5e3ff', fontSize: 15 }}>ETB {Number(user?.available_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    {Number((user as any)?.bonus_balance ?? 0) > 0 && (
                      <TouchableOpacity onPress={() => setBonusModalVisible(true)} style={{ marginLeft: 6, backgroundColor: 'rgba(0,218,243,0.15)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="gift" size={11} color="#00daf3" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => refreshProfile?.()} style={{ marginLeft: 4 }}>
                    <Ionicons name="refresh" size={13} color="#00daf3" />
                  </TouchableOpacity>
                </View>

                {/* APP Download Button */}
                {!isPwaInstalled && (
                  <Animated.View style={{ transform: [{ scale: appPulseAnim }] }}>
                    <TouchableOpacity
                      onPress={handleAppDownload}
                      style={{
                        flexDirection: 'row',
                        height: 32,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        backgroundColor: '#00daf3',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginRight: 8,
                        shadowColor: deferredPrompt ? '#00daf3' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: deferredPrompt ? 0.6 : 0,
                        shadowRadius: deferredPrompt ? 8 : 0,
                      }}
                    >
                      <Ionicons name="cloud-download-outline" size={14} color="#0B0B0F" />
                      <Text style={{ color: "#0B0B0F", fontSize: 11, fontWeight: '900' }}>APP</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* Utilities */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={handleLanguageToggle} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="globe-outline" size={16} color={language === 'am' ? '#00daf3' : '#a8a7d4'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' }}>
                    <Ionicons name="notifications-outline" size={18} color="#a8a7d4" />
                    {unreadCount > 0 && (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{ width: 1, height: 24, backgroundColor: 'rgba(68,68,107,0.2)', marginHorizontal: 8 }} />
                {/* Profile Link */}
                <TouchableOpacity onPress={() => navigateTo('/(authed)/home/account')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '600', fontSize: 14, color: '#e5e3ff' }}>{user?.username || 'Profile'}</Text>
                    <Text style={{ fontWeight: '800', fontSize: 10, color: '#00daf3', letterSpacing: 0.5 }}>LEVEL 24</Text>
                  </View>
                  {(user as any)?.avatar ? (
                    <Image source={{ uri: fixUrl((user as any).avatar) || undefined }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#00daf3' }} />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#00daf3', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#0B0B0F', fontWeight: '800', fontSize: 14 }}>
                        {(user?.username || user?.id || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Row: Sidebar + Content */}
            <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
              {/* Left Sidebar */}
              {showLeftSidebar && (
                <View style={{
                  width: isDesktop ? 280 : 72,
                  backgroundColor: '#111115',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  paddingBottom: 10,
                  paddingTop: 16,
                  flexDirection: 'column',
                }}>
                  <View style={{ flex: 1 }}>
                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="home-outline" label={isEN ? "Home" : "መነሻ"} isActive={pathname.includes('/home/gameplay')} onPress={() => navigateTo('/(authed)/home/gameplay')} />
                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="receipt-outline" label={isEN ? "History" : "ታሪክ"} isActive={pathname.includes('/games')} onPress={() => navigateTo('/(authed)/games')} />
                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="trophy-outline" label={isEN ? "Leaderboard" : "ደረጃዎች"} isActive={pathname.includes('/home/leaderboard')} onPress={() => navigateTo('/(authed)/home/leaderboard')} />
                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="person-outline" label={isEN ? "Profile" : "መገለጫ"} isActive={pathname.includes('/home/account')} onPress={() => navigateTo('/(authed)/home/account')} />

                    <View style={{ height: 20 }} />
                    {isDesktop && <Text style={{ paddingHorizontal: 20, color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>WALLET</Text>}

                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="wallet-outline" label={isEN ? "Deposit" : "ገንዘብ አስገባ"} isActive={depositVisible} onPress={() => setDepositVisible(true)} />
                    <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="cash-outline" label={isEN ? "Withdraw" : "ገንዘብ አውጣ"} isActive={withdrawVisible} onPress={() => setWithdrawVisible(true)} />

                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                      <>
                        <View style={{ height: 20 }} />
                        <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="shield-half-outline" label="Admin Center" isActive={isAdminRoute} onPress={() => navigateTo('/(authed)/admin')} />
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Slot content */}
              <View style={{ flex: 1, backgroundColor: '#111115', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                <Slot />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: (isDesktop || isTablet) ? 'row' : 'column' }}>
            {/* Left Sidebar — desktop only (≥1024px) or tablet (collapsed) */}
            {showLeftSidebar && (
              <View style={{
                width: isDesktop ? 280 : 72,
                height: '100%',
                backgroundColor: '#09090b',
                borderRightWidth: 1,
                borderRightColor: 'rgba(39, 39, 42, 0.4)',
                zIndex: 60,
                paddingBottom: 10,
                flexDirection: 'column',
              }}>
                {/* Header Spacer (Push contents below top header) */}
                <View style={{ height: 72 }} />

                <View style={{ flex: 1 }}>
                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="home-outline" label={isEN ? "Home" : "መነሻ"} isActive={pathname.includes('/home/gameplay')} onPress={() => navigateTo('/(authed)/home/gameplay')} />
                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="receipt-outline" label={isEN ? "History" : "ታሪክ"} isActive={pathname.includes('/games')} onPress={() => navigateTo('/(authed)/games')} />
                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="trophy-outline" label={isEN ? "Leaderboard" : "ደረጃዎች"} isActive={pathname.includes('/home/leaderboard')} onPress={() => navigateTo('/(authed)/home/leaderboard')} />
                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="person-outline" label={isEN ? "Profile" : "መገለጫ"} isActive={pathname.includes('/home/account')} onPress={() => navigateTo('/(authed)/home/account')} />

                  <View style={{ height: 20 }} />
                  {isDesktop && <Text style={{ paddingHorizontal: 20, color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>WALLET</Text>}

                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="wallet-outline" label={isEN ? "Deposit" : "ገንዘብ አስገባ"} isActive={depositVisible} onPress={() => setDepositVisible(true)} />
                  <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="cash-outline" label={isEN ? "Withdraw" : "ገንዘብ አውጣ"} isActive={withdrawVisible} onPress={() => setWithdrawVisible(true)} />

                  {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                    <>
                      <View style={{ height: 20 }} />
                      <SidebarItem isDesktop={isDesktop} collapsed={!isDesktop} icon="shield-half-outline" label="Admin Center" isActive={isAdminRoute} onPress={() => navigateTo('/(authed)/admin')} />
                    </>
                  )}
                </View>
              </View>
            )}

            <View style={{ flex: 1, backgroundColor: '#0c0c1f', overflow: 'hidden', paddingTop: (isDesktop || isTablet) && !isAdminRoute ? 72 : 0 }}>
              <Slot />
            </View>
          </View>
        )}

        {/* Render gates after main views so zIndex works correctly on Web */}
        <React.Suspense fallback={null}>
          <GlobalInvitesGate />
          {/* Global Modals for Web — rendered for ALL web screen sizes to prevent route crash on mobile-width web */}
          {Platform.OS === 'web' && (
            <>
              <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
              <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
              <BonusLogsModal visible={bonusModalVisible} onClose={() => setBonusModalVisible(false)} language={language} />
            </>
          )}
          <LogoutConfirmation
            visible={logoutVisible}
            onCancel={() => setLogoutVisible(false)}
            onConfirm={async () => {
              setLogoutVisible(false);
              await logout();
            }}
          />
          <WelcomeBonusModal
            visible={welcomeBonusVisible}
            onClose={handleCloseWelcomeBonus}
          />
          <NotificationsPopover
            visible={notificationsVisible}
            onClose={() => setNotificationsVisible(false)}
            onUnreadCountChange={setUnreadCount}
          />
        </React.Suspense>

        {/* PWA Install Instructions Modal */}
        <Modal
          visible={pwaModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPwaModalVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: '#0c0c1f',
              borderWidth: 1,
              borderColor: 'rgba(0,218,243,0.2)',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Install XOET Web App</Text>
                <TouchableOpacity onPress={() => setPwaModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              {/* Device specific instructions */}
              <View style={{ marginBottom: 24 }}>
                {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                  // Telegram Browser Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Telegram Browser Detected:</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }}>
                      Telegram's in-app browser has sandbox restrictions that prevent installing web apps or downloading files directly.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>three dots</Text> at the top right of this screen.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Browser"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Open in Chrome/Safari"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Once opened in your system browser, click the download button again.
                      </Text>
                    </View>
                  </View>
                ) : Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  // iOS Safari Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>Instructions for iOS Safari:</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Share</Text> button in Safari (box with an arrow pointing up at the bottom).
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Scroll down the share menu and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>3</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Tap <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add"</Text> in the top right corner to complete installation.
                      </Text>
                    </View>
                  </View>
                ) : (
                  // Android / Desktop Instructions
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: '#00daf3', fontWeight: '800', fontSize: 14 }}>How to Install:</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>1</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        Open your browser's menu (three dots icon in Chrome) and select <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Add to Home Screen"</Text> or <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>"Install App"</Text>.
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,218,243,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>2</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>
                        On desktop, look for the <Text style={{ color: '#00daf3', fontWeight: 'bold' }}>Install icon</Text> in the browser address bar next to the URL.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Fallback to Android APK */}
              <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
                {Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent) ? (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Android Users (Via Telegram Channel)
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Linking.openURL('https://t.me/xoethiopia1').catch(() => { });
                      }}
                      style={{
                        backgroundColor: '#0088cc',
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Get APK from Channel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Android Users (Direct APK)
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Linking.openURL('https://xoethiopia.com/xoet.apk').catch(() => { });
                      }}
                      style={{
                        backgroundColor: '#ef4444',
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Download Android APK</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SocketProvider>
  );
}
