import { SocketProvider, useSocket } from "../../context/socketContext";
import { Ionicons } from "@expo/vector-icons";
import WelcomePopup from "../../components/WelcomePopup";
import { Redirect, Slot, useRouter, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Platform, useWindowDimensions, Text, TouchableOpacity, Animated, Easing, StyleSheet, Image } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/authContext";
import { WebPressable } from "../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../components/WebModals";
import { haptics } from "../../lib/haptcs";
import LogoutConfirmation from "../../components/LogoutConfirmation";
import { useBackgroundMusic } from "../../context/BackgroundMusicProvider";
import WelcomeBonusModal from "../../components/WelcomeBonusModal";
import BonusLogsModal from "../../components/BonusLogsModal";
import { API_URL } from "../../config";
import { useToast } from "../../context/ToastContext";


const SidebarItem = ({ icon, label, isActive, onPress, badge, collapsed }: { icon: any; label: string; isActive: boolean; onPress: () => void; badge?: string; collapsed?: boolean }) => {
  return (
    <WebPressable
      onPress={onPress}
      style={({ hovered }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: collapsed ? 0 : 24,
          justifyContent: collapsed ? 'center' : 'flex-start',
          backgroundColor: isActive ? 'rgba(124,77,255,0.1)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          borderRightWidth: isActive ? 4 : 0,
          borderRightColor: '#7c4dff',
          transition: 'all 0.2s ease',
        }
      ]}
    >
      <Ionicons name={icon} size={20} color={isActive ? '#7c4dff' : 'rgba(229,227,255,0.5)'} style={{ marginRight: collapsed ? 0 : 16 }} />
      {!collapsed && (
        <Text style={{
          color: isActive ? '#fff' : 'rgba(229,227,255,0.5)',
          fontSize: 15,
          fontWeight: isActive ? '800' : '600',
          letterSpacing: 0.3,
          flex: 1,
        }}>
          {label}
        </Text>
      )}
      {!collapsed && badge && (
        <View style={{ backgroundColor: '#fd6f85', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{badge}</Text>
        </View>
      )}
    </WebPressable>
  );
};

const HeaderButton = ({ icon, onPress, isActive, activeColor }: { icon: any; onPress: () => void; isActive?: boolean; activeColor?: string }) => (
  <WebPressable
    onPress={onPress}
    style={({ hovered }) => ({
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isActive ? (activeColor || 'rgba(167,139,250,0.15)') : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
      borderWidth: 1,
      borderColor: isActive ? (activeColor ? activeColor.replace('0.15', '0.3') : 'rgba(167,139,250,0.3)') : 'transparent',
      transform: [{ scale: hovered ? 1.08 : 1 }],
      transition: 'all 0.15s ease',
    })}
  >
    <Ionicons name={icon} size={18} color={isActive ? (activeColor?.includes('16,185') ? '#10b981' : '#a78bfa') : 'rgba(167,167,210,0.7)'} />
  </WebPressable>
);

function MatchmakingGate() {
  const { onMessage } = useSocket();
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
  const { onMessage } = useSocket();
  const { success, info, warning, error: toastError } = useToast();
  const { refreshProfile } = useAuth();

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

export default function AuthedLayout() {
  const { user, token, logout, language, switchLanguage, t, refreshProfile, fixUrl } = useAuth();
  const { isPlaying, toggleMusic, unlockAudio } = useBackgroundMusic();
  const isEN = language === "en";
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isTablet  = Platform.OS === "web" && width >= 768 && width < 1024;
  const isGameplayRoute = pathname.includes("/home/gameplay") || pathname === "/home";
  const isAdminRoute = pathname.includes("/admin");
  const showRightSidebar = isDesktop && !isGameplayRoute && !isAdminRoute;
  const showLeftSidebar = (isDesktop || isTablet) && !isAdminRoute;
  const isAccountPage = pathname.includes("/home/account");
  const isMissingProfile = user ? (!user.username || !user.display_name) : false;
  const isMobile = width < 768;

  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [welcomeBonusVisible, setWelcomeBonusVisible] = React.useState(false);
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
      <View style={{ flex: 1, backgroundColor: '#0c0c1f' }}>
        {/* Background ambient effects wrapper removed to match HTML */}

        {/* Top Header HTML mapping */}
        {(isDesktop || isTablet) && !isAdminRoute && (
          <View style={{
            position: 'absolute', top: 0, width: '100%', height: 72,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: 40, zIndex: 70, backgroundColor: 'rgba(12,12,31,0.9)',
            borderBottomWidth: 1, borderBottomColor: 'rgba(68,68,107,0.15)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={require('../../assets/images/icon.jpg')}
                style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(166,140,255,0.4)' }}
              />
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#e5e3ff', letterSpacing: -0.5 }}>
                XO<Text style={{ color: '#a68cff' }}>ET</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* Balance */}
              {/* Balance + Refresh button */}
              <View style={{ backgroundColor: '#171732', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(68,68,107,0.15)', marginRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="wallet" size={14} color="#a68cff" />
                  <Text style={{ fontWeight: '700', color: '#e5e3ff', fontSize: 15 }}>ETB {Number(user?.available_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  {Number((user as any)?.bonus_balance ?? 0) > 0 && (
                    <TouchableOpacity onPress={() => setBonusModalVisible(true)} style={{ marginLeft: 6, backgroundColor: 'rgba(0,218,243,0.15)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="gift" size={11} color="#00daf3" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => refreshProfile?.()} style={{ marginLeft: 4 }}>
                  <Ionicons name="refresh" size={13} color="#a68cff" />
                </TouchableOpacity>
              </View>
              {/* Utilities */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={handleLanguageToggle} style={{ flexDirection: 'row', height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                   <Ionicons name="language" size={16} color={language === 'am' ? '#a68cff' : '#a8a7d4'} />
                   <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{language === 'am' ? 'AM' : 'EN'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleSound} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name={isPlaying ? "volume-high" : "volume-mute"} size={20} color="#a8a7d4" />
                </TouchableOpacity>
              </View>
              <View style={{ width: 1, height: 24, backgroundColor: 'rgba(68,68,107,0.2)', marginHorizontal: 8 }} />
              {/* Profile Link */}
              <TouchableOpacity onPress={() => navigateTo('/(authed)/home/account')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
                {(user as any)?.avatar ? (
                  <Image source={{ uri: fixUrl((user as any).avatar) || undefined }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(166,140,255,0.4)' }} />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(166,140,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(166,140,255,0.3)' }}>
                    <Text style={{ color: '#a68cff', fontWeight: '800', fontSize: 14 }}>
                      {(user?.username || user?.id || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={{ fontWeight: '600', fontSize: 15, color: '#e5e3ff' }}>{user?.username || 'Profile'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ flex: 1, flexDirection: (isDesktop || isTablet) ? 'row' : 'column', paddingTop: (isDesktop || isTablet) && !isAdminRoute ? 72 : 0 }}>
          {/* Left Sidebar — desktop only (≥1024px) or tablet (collapsed) */}
          {showLeftSidebar && (
            <View style={{
              width: isDesktop ? 256 : 64,
              height: '100%',
              backgroundColor: '#0c0c1f',
              borderRightWidth: 1,
              borderRightColor: 'rgba(68,68,107,0.1)',
              zIndex: 60,
              paddingVertical: 32,
              flexDirection: 'column',
            }}>
              {/* Sidebar Header/Logo area - implied by Nav */}
              <View style={{ flex: 1 }}>
                <SidebarItem collapsed={!isDesktop} icon="game-controller" label={isEN ? "Games" : "ጨዋታዎች"} isActive={pathname.includes('/home/gameplay')} onPress={() => navigateTo('/(authed)/home/gameplay')} />
                <SidebarItem collapsed={!isDesktop} icon="wallet" label={isEN ? "Payments" : "ክፍያዎች"} isActive={pathname.includes('/home/transactions')} onPress={() => navigateTo('/(authed)/home/transactions')} />
                <SidebarItem collapsed={!isDesktop} icon="person" label={isEN ? "Profile" : "መገለጫ"} isActive={pathname.includes('/home/account')} onPress={() => navigateTo('/(authed)/home/account')} />
                <SidebarItem collapsed={!isDesktop} icon="receipt" label={isEN ? "History" : "ታሪክ"} isActive={pathname.includes('/games')} onPress={() => navigateTo('/(authed)/games')} />

                {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                  <SidebarItem collapsed={!isDesktop} icon="shield-half" label="Admin Center" isActive={isAdminRoute} onPress={() => navigateTo('/(authed)/admin')} />
                )}
              </View>

              {/* Total Balance Sidebar Card - Moved above logout */}
              {!isDesktop ? null : (
              <View style={{ marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 20, backgroundColor: 'rgba(23,23,50,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{isEN ? 'TOTAL BALANCE' : 'ጠቅላላ ቀሪ ሂሳብ'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => refreshProfile?.()} style={{ padding: 4 }}>
                      <Ionicons name="refresh" size={13} color="#7c4dff" />
                    </TouchableOpacity>
                    <Ionicons name="wallet-outline" size={14} color="#7c4dff" />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>ETB {Number(user?.available_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <TouchableOpacity onPress={() => setBonusModalVisible(true)} style={{ backgroundColor: 'rgba(0,218,243,0.1)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,218,243,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="gift" size={12} color="#00daf3" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setDepositVisible(true)} style={{ marginTop: 8, backgroundColor: 'rgba(124,77,255,0.1)', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#a68cff', fontSize: 11, fontWeight: '800' }}>{isEN ? 'ADD FUNDS' : 'ገንዘብ አስገባ'}</Text>
                </TouchableOpacity>
              </View>
              )}

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 16 }}>
                <TouchableOpacity onPress={() => setLogoutVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: isDesktop ? 24 : 0, justifyContent: isDesktop ? 'flex-start' : 'center', paddingVertical: 16 }}>
                  <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.4)" />
                  {isDesktop && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' }}>{isEN ? 'Logout' : 'ውጣ'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Main Slot Area */}
          <View style={{ flex: 1, backgroundColor: '#0c0c1f', overflow: 'hidden' }}>
            <Slot />
          </View>
        </View>
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
          amount={10} 
        />
      </View>
    </SocketProvider>
  );
}
