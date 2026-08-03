
// components/game/DesktopLayout.tsx
// Full desktop/tablet layout for the gameplay landing screen (Lucky Spin & XO Game).
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Linking,
  FlatList,
  Modal,
  TextInput,
  ImageBackground,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, G, Text as SvgText, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";

import { WebPressable } from "../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../components/WebModals";
import ProfileEditModal from "../../components/ProfileEditModal";
import ReferralModal from "../../components/ReferralModal";
import FriendMatchModal from "../../components/game/FriendMatchModal";
import PromotionPopup from "../../components/PromotionPopup";
import PwaInstallModal from "./PwaInstallModal";
import BoardDemo from "./BoardDemo";
import RoomSheet from "./RoomSheet";
import type { RoomConfig, SheetStep } from "./gameplayConstants";
import { SlidingNumber } from "./SlidingNumber";
import { API_URL } from "../../config";

// Helper to resolve avatar URLs
function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return url;
}

type LeaderboardEntry = {
  id?: string;
  username?: string;
  avatar?: string;
  wins: number;
  isMe?: boolean;
};

type DesktopLayoutProps = {
  user: any;
  token: string | null;
  balance: number;
  language: string;
  isDesktop: boolean;
  isTablet: boolean;
  isBanned: boolean;
  isSearching: boolean;
  isEN: boolean;
  weeklyLeaderboard: LeaderboardEntry[];
  weeklyPrizes: { rank: number; amount: number }[];
  loadingWeekly: boolean;
  secondsRemaining: number;
  winRate: number;
  rankMeta: { label: string; tone: string };
  rawTickerList: { username: string; amount: number | string }[];
  roomSheetVisible: boolean;
  sheetStep: SheetStep;
  selectedRoom: RoomConfig;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  userCaps: any;
  depositVisible: boolean;
  withdrawVisible: boolean;
  friendModalVisible: boolean;
  pwaModalVisible: boolean;
  showReferralModal: boolean;
  showPromo: boolean;
  inviteResult: any;
  promoConfig: any;
  setDepositVisible: (v: boolean) => void;
  setWithdrawVisible: (v: boolean) => void;
  setFriendModalVisible: (v: boolean) => void;
  setPwaModalVisible: (v: boolean) => void;
  setShowReferralModal: (v: boolean) => void;
  setShowPromo: (v: boolean) => void;
  setInviteResult: (v: any) => void;
  openRoomSheet: () => void;
  closeRoomSheet: () => void;
  goBackToRooms: () => void;
  onSelectRoom: (id: RoomConfig["id"]) => void;
  selectAmount: (room: RoomConfig, min: number, max: number) => void;
  handleSendInvite: (username: string, betAmount: number) => void;
  refreshProfile: () => void;
  handleLanguageToggle: () => void;
  // Router
  router: any;
  // App config
  appConfig: any;
  selectedTab: "XO_GAME" | "SPIN";
  setSelectedTab: (v: "XO_GAME" | "SPIN") => void;
  bgMusicPlaying?: boolean;
  onToggleSound?: () => void;
  unreadCount?: number;
  setNotificationsVisible?: (v: boolean) => void;
};


export default function DesktopLayout(props: DesktopLayoutProps) {
  const {
    user, token, balance, language, isDesktop, isTablet, isBanned, isSearching, isEN,
    weeklyLeaderboard, weeklyPrizes, loadingWeekly, secondsRemaining,
    winRate, rankMeta, rawTickerList,
    roomSheetVisible, sheetStep, selectedRoom, backdropOpacity, sheetTranslateY, userCaps,
    depositVisible, withdrawVisible, friendModalVisible, pwaModalVisible, showReferralModal, showPromo,
    inviteResult, promoConfig,
    setDepositVisible, setWithdrawVisible, setFriendModalVisible, setPwaModalVisible,
    setShowReferralModal, setShowPromo, setInviteResult,
    openRoomSheet, closeRoomSheet, goBackToRooms, onSelectRoom, selectAmount,
    refreshProfile, handleLanguageToggle, handleSendInvite,
    router, appConfig,
    selectedTab, setSelectedTab,
    bgMusicPlaying = true,
    onToggleSound = () => {},
    unreadCount = 0,
    setNotificationsVisible = () => {},
  } = props;

  const isDesktopRow = isDesktop && !isTablet;

  // Continuous idle rotation animation for the featured spin wheel
  const idleSpinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(idleSpinAnim, {
        toValue: 1,
        duration: 30000, // 30 seconds per rotation for a smooth widescreen look
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, []);

  const idleSpinRotate = idleSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const [spinLoading, setSpinLoading] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("100");

  const chips = ["50", "100", "250", "500", "1000"];

  const handleNavClick = (screen: string) => {
    if (screen === "home") router.push("/(authed)/home/gameplay");
    else if (screen === "history") router.push("/(authed)/home/history");
    else if (screen === "leaderboard") router.push("/(authed)/home/leaderboard");
    else if (screen === "transactions") router.push("/(authed)/home/transactions");
    else if (screen === "profile") router.push("/(authed)/home/account");
    else if (screen === "admin") router.push("/admin" as any);
  };

  const handleSpinNow = () => {
    setSpinError(null);
    setShowStakeModal(true);
  };

  const handleConfirmSpin = () => {
    const stakeVal = Number(stakeAmount);
    if (isNaN(stakeVal) || stakeVal <= 0) {
      setSpinError(isEN ? "Invalid stake amount" : "ትክክለኛ ያልሆነ መጠን");
      return;
    }
    if (balance < stakeVal) {
      setSpinError(isEN ? "Insufficient balance" : "በቂ ሂሳብ የሎትም");
      return;
    }
    setShowStakeModal(false);
    router.push({
      pathname: '/(authed)/home/spin',
      params: { mode: "RAIL", stake: String(stakeVal) }
    } as any);
  };

  return (
    <View style={s.rootContainer}>
      {/* Background Glowing Blobs matching img 1 corner aura */}
      <View style={{
        position: 'absolute',
        bottom: -200,
        left: -200,
        width: 600,
        height: 600,
        borderRadius: 300,
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        ...(Platform.OS === 'web' ? { filter: 'blur(150px)' } as any : {}),
      }} />
      <View style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } as any : {}),
      }} />

      {/* Modals & Profile */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <ProfileEditModal visible={!user?.username} onClose={() => { }} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />

      {roomSheetVisible && (
        <RoomSheet
          language={language}
          balance={balance}
          visible={roomSheetVisible}
          step={sheetStep}
          selectedRoom={selectedRoom}
          backdropOpacity={backdropOpacity}
          sheetTranslateY={sheetTranslateY}
          onClose={closeRoomSheet}
          onBack={goBackToRooms}
          onSelectRoom={onSelectRoom}
          onSelectAmount={selectAmount}
          isDesktop={isDesktop}
          userCaps={userCaps}
        />
      )}

      {/* Header bar */}
      <View style={s.header}>
        <View style={s.headerContentWrapper}>
          <View style={s.logoContainer}>
            <Image source={require("../../assets/images/icon.jpg")} style={s.logoImage} resizeMode="cover" />
            <Text style={s.logoText}>XO ETHIOPIA</Text>
          </View>

          {/* Center: SPIN / XO GAME toggle */}
          <View style={s.toggleContainer}>
            <TouchableOpacity
              onPress={() => setSelectedTab("SPIN")}
              style={[s.toggleBtn, selectedTab === "SPIN" && s.toggleBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[s.toggleBtnText, selectedTab === "SPIN" && s.toggleBtnTextActive]}>SPIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab("XO_GAME")}
              style={[s.toggleBtn, selectedTab === "XO_GAME" && s.toggleBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[s.toggleBtnText, selectedTab === "XO_GAME" && s.toggleBtnTextActive]}>XO GAME</Text>
            </TouchableOpacity>
          </View>

          {/* Right: Widescreen Utility Cluster matching img 4 layout */}
          <View style={s.utilityCluster}>
            <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={s.utilityBtn} activeOpacity={0.8}>
              <Ionicons name="cloud-download-outline" size={16} color="#8b93a7" />
              <Text style={s.utilityBtnText}>APP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLanguageToggle} style={s.utilityBtn} activeOpacity={0.8}>
              <Ionicons name="globe-outline" size={15} color="#8b93a7" />
              <Text style={s.utilityBtnText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onToggleSound} style={s.utilityBtn} activeOpacity={0.8}>
              <Ionicons name={bgMusicPlaying ? "volume-medium-outline" : "volume-mute-outline"} size={16} color="#8b93a7" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={s.bellBtn} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={16} color="#8b93a7" />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile Chip */}
            <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.profileChip} activeOpacity={0.8}>
              <View style={s.profileChipAvatar}>
                <Text style={s.profileChipAvatarText}>
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}
                </Text>
              </View>
              <View>
                <Text style={s.profileChipName}>{user?.username || "Player"}</Text>
                <Text style={s.profileChipVip}>VIP 24</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main tab wrapper content */}
      {selectedTab === "SPIN" ? (
        /* ================= LUCKY SPIN TAB VIEW ================= */
        <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageContentWrapper}>
            <View style={s.threeColumnRow}>
              {/* 1. LEFT SIDEBAR (fixed width 280px) */}
              {/* 1. LEFT SIDEBAR (split cards) */}
              <View style={[s.leftSidebar, { alignSelf: "stretch" }]}>
                {/* Card 1: User Profile & Balance */}
                <View style={s.card}>
                  <View style={s.userCardHeader}>
                    <View style={s.userCardAvatar}>
                      <Text style={s.userCardAvatarText}>
                        {user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.userCardName} numberOfLines={1}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                      <View style={s.onlineRow}>
                        <View style={s.onlineDot} />
                        <Text style={s.onlineText}>Online</Text>
                      </View>
                    </View>
                  </View>

                  {/* Available Balance card */}
                  <View style={s.tokensRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tokenLabel}>AVAILABLE BALANCE</Text>
                      <Text style={[s.tokenVal, { color: "#22d3ee" }]}>ETB {balance.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={refreshProfile} style={[s.tokenPlusBtn, { backgroundColor: "#22d3ee" }]} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={12} color="#0a0e1a" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Card 2: Navigation & Wallet */}
                <View style={[s.card, { flex: 1, justifyContent: "space-between" }]}>
                  {/* Vertical Navigation Links */}
                  <View style={{ justifyContent: "center", marginVertical: 10 }}>
                    <TouchableOpacity onPress={() => handleNavClick('home')} style={[s.navItem, s.navItemActive]} activeOpacity={0.8}>
                      <View style={s.navItemActiveBar} />
                      <Ionicons name="home" size={18} color="#8b5cf6" />
                      <Text style={[s.navText, s.navTextActive]}>Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('history')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="time-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>History</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="trophy-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Leaderboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('transactions')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="receipt-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Transactions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="person-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Profile</Text>
                    </TouchableOpacity>

                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                      <TouchableOpacity onPress={() => handleNavClick('admin')} style={s.navItem} activeOpacity={0.8}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#8b93a7" />
                        <Text style={s.navText}>Admin</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Wallet Summary Panel */}
                  <View>
                    <Text style={s.sectionTitleSmall}>WALLET</Text>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Deposit</Text>
                      <Text style={[s.walletValSmall, { color: "#22c55e" }]}>+ 3,420 ETB</Text>
                    </View>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Withdraw</Text>
                      <Text style={[s.walletValSmall, { color: "#ef4444" }]}>- 420 ETB</Text>
                    </View>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Transactions</Text>
                      <Text style={s.walletValSecond}>12 today</Text>
                    </View>

                    {/* Direct wallet buttons */}
                    <View style={s.walletButtons}>
                      <TouchableOpacity onPress={() => setDepositVisible(true)} style={[s.walletBtnSmall, { borderColor: "#22d3ee" }]} activeOpacity={0.8}>
                        <Text style={[s.walletBtnTextSmall, { color: "#22d3ee" }]}>DEPOSIT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={[s.walletBtnSmall, { borderColor: "#7c3aed" }]} activeOpacity={0.8}>
                        <Text style={[s.walletBtnTextSmall, { color: "#7c3aed" }]}>WITHDRAW</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. CENTER COLUMN (flexible, largest) */}
              <View style={s.centerColumn}>
                {/* Three action buttons row */}
                <View style={s.quickActionsRow}>
                  {/* Card 1: Deposit */}
                  <TouchableOpacity onPress={() => setDepositVisible(true)} style={s.quickActionCard} activeOpacity={0.85}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(124, 58, 237, 0.1)" }]}>
                      <Ionicons name="arrow-down" size={18} color="#7c3aed" />
                    </View>
                    <View>
                      <Text style={s.quickActionLabel}>ADD FUNDS</Text>
                      <Text style={s.quickActionVal}>DEPOSIT</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 2: Withdraw */}
                  <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={s.quickActionCard} activeOpacity={0.85}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                      <Ionicons name="arrow-up" size={18} color="#ef4444" />
                    </View>
                    <View>
                      <Text style={s.quickActionLabel}>CASH OUT</Text>
                      <Text style={s.quickActionVal}>WITHDRAW</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 3: Transaction */}
                  <TouchableOpacity onPress={() => router.push('/(authed)/home/transactions' as any)} style={[s.quickActionCard, s.quickActionCardGlow]} activeOpacity={0.85}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)" }]}>
                      <Ionicons name="swap-horizontal" size={18} color="#22d3ee" />
                    </View>
                    <View>
                      <Text style={s.quickActionLabel}>VIEW ALL</Text>
                      <Text style={[s.quickActionVal, { color: "#22d3ee" }]}>TRANSACTIONS</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Hero Spin Wheel Board Section - banknotes visible only in this center card */}
                <ImageBackground
                  source={require("../../assets/images/spin-bg.jpg")}
                  style={s.heroSpinCard}
                  imageStyle={{ borderRadius: 28, opacity: 0.85, width: "100%", height: "100%" }}
                  resizeMode="cover"
                >
                  {/* Semi-transparent dark purple overlay with lower opacity so banknotes are visible */}
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(15, 10, 35, 0.45)", borderRadius: 28 }]} />

                  {/* Content */}
                  <Text style={s.heroSubLabel}>✦ FEATURED GAME ✦</Text>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6, marginBottom: 14 }}>
                    <Svg width={360} height={54} viewBox="0 0 360 54">
                      <Defs>
                        <SvgLinearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#ec4899" />
                          <Stop offset="100%" stopColor="#c4b5fd" />
                        </SvgLinearGradient>
                      </Defs>
                      <SvgText
                        x="180"
                        y="42"
                        fill="url(#titleGrad)"
                        fontSize="46"
                        fontWeight="900"
                        textAnchor="middle"
                        fontFamily="Inter, sans-serif"
                        letterSpacing="-1.5"
                      >
                        XO SPIN
                      </SvgText>
                    </Svg>
                  </View>

                  {/* Simple Centered Wheel - with continuous rotation */}
                  <View style={{ width: 450, height: 450, alignItems: "center", justifyContent: "center", marginVertical: 14, alignSelf: "center" }}>
                    <Animated.View style={{ transform: [{ rotate: idleSpinRotate }], width: 450, height: 450 }}>
                      <SpinWheelSvg size={450} mode="RAIL" showPointer={false} />
                    </Animated.View>
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <SpinWheelSvg size={450} onlyPointer={true} />
                    </View>
                  </View>

                  {spinError && (
                    <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>
                      {spinError}
                    </Text>
                  )}

                  {/* Spin button */}
                  <TouchableOpacity
                    style={[s.spinBtn, spinLoading && { opacity: 0.7 }]}
                    activeOpacity={0.9}
                    onPress={handleSpinNow}
                    disabled={spinLoading}
                  >
                    {spinLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={s.spinBtnText}>SPIN NOW!</Text>
                    )}
                  </TouchableOpacity>
                </ImageBackground>
              </View>

              {/* 3. RIGHT SIDEBAR (fixed width 320px) */}
              <View style={[s.rightSidebar, { gap: 12 }]}>
                {/* Top leaders card */}
                <View style={s.card}>
                  <View style={s.leaderboardHeader}>
                    <Text style={s.leaderboardTitle}>TOP LEADERS</Text>
                    <Ionicons name="trophy" size={18} color="#f5b642" />
                  </View>
                  <Text style={s.leaderboardStats}>248 online  •  56 friends  •  48 playing</Text>

                  {/* Standings entries (Padded to 5 slots) */}
                  <View style={s.leadersList}>
                    {Array.from({ length: 5 }, (_, idx) => {
                      const lead = (weeklyLeaderboard && weeklyLeaderboard[idx]) ? weeklyLeaderboard[idx] : null;
                      const rank = idx + 1;
                      const hasCrown = rank === 1 && lead && (lead.wins > 0);
                      const circleBg = rank === 1 ? "#f5b642" : (rank === 2 ? "#b9cacb" : (rank === 3 ? "#f97316" : (rank === 4 ? "#a855f7" : "#22c55e")));
                      return (
                        <View key={lead?.id || idx} style={s.leaderRow}>
                          <View style={[s.leaderBadge, { backgroundColor: circleBg, opacity: lead ? 1 : 0.4 }]}>
                            <Text style={s.leaderBadgeText}>{rank}</Text>
                          </View>
                          <View style={s.leaderDetails}>
                            <Text style={[s.leaderName, !lead && { color: "rgba(255,255,255,0.3)" }]} numberOfLines={1}>
                              {lead ? `@${lead.username || "user"}` : "@---"}
                            </Text>
                            <Text style={[s.leaderVal, !lead && { color: "rgba(255,255,255,0.2)" }]}>
                              {lead ? `${lead.wins} Wins` : "0 Wins"}
                            </Text>
                          </View>
                          {hasCrown && <Ionicons name="trophy" size={16} color="#f5b642" />}
                        </View>
                      );
                    })}
                  </View>

                  {/* View Standings */}
                  <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.standingsBtn} activeOpacity={0.8}>
                    <Text style={s.standingsBtnText}>VIEW ALL LEADERS</Text>
                  </TouchableOpacity>
                </View>

                {/* XO Support Card */}
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://t.me/xoet_support').catch(() => { })}
                  activeOpacity={0.85}
                  style={[s.card, { paddingVertical: 14 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)", width: 36, height: 36, borderRadius: 18 }]}><Ionicons name="chatbubbles-outline" size={18} color="#22d3ee" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>XO SUPPORT</Text>
                      <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '600', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Online 24/7 Support Channel</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                  </View>
                </TouchableOpacity>

                {/* XO Channel Card */}
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://t.me/xoethiopia1').catch(() => { })}
                  activeOpacity={0.85}
                  style={[s.card, { paddingVertical: 14 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.1)", width: 36, height: 36, borderRadius: 18 }]}><Ionicons name="paper-plane-outline" size={18} color="#8b5cf6" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>XO CHANNEL</Text>
                      <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '600', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Join our Telegram channel</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                  </View>
                </TouchableOpacity>

                {/* 5-Player Spin Card (Matching Image 2 design) */}
                <View style={{
                  backgroundColor: '#0c0f24',
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  padding: 22,
                  shadowColor: '#8b5cf6',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: 10,
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 260,
                }}>
                  {/* Header row: MULTIPLAYER badge on left, LIVE indicator on right */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(0, 218, 243, 0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 218, 243, 0.3)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 14,
                    }}>
                      <Ionicons name="people-sharp" size={13} color="#00daf3" />
                      <Text style={{ color: '#00daf3', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, fontFamily: 'Inter, sans-serif' }}>MULTIPLAYER</Text>
                    </View>

                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}>
                      <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>LIVE</Text>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                    </View>
                  </View>

                  {/* Main content row: Title & text on left, Mini Wheel Illustration on right */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
                    <View style={{ flex: 1, minWidth: 110 }}>
                      <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>
                        5-PLAYER
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -2 }}>
                        <Text style={{ color: '#00daf3', fontSize: 30, fontWeight: '900', letterSpacing: 1, fontFamily: 'Inter, sans-serif' }}>
                          SPIN
                        </Text>
                        <Ionicons name="people" size={24} color="#a78bfa" />
                      </View>

                      <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 11, marginTop: 8, lineHeight: 16, fontFamily: 'Inter, sans-serif' }}>
                        Join other players online.{'\n'}Win proportional odds.
                      </Text>
                    </View>

                    {/* Right Graphic: Transparent 3D 5-Player Spin Illustration (3d-5p-spin.png) */}
                    <View style={{ width: 200, height: 170, alignItems: 'center', justifyContent: 'center' }}>
                      <Image
                        source={require("../../assets/images/3d-5p-spin.png")}
                        style={{ width: 200, height: 170, resizeMode: "contain" }}
                      />
                    </View>
                  </View>

                  {/* Bottom Row: Entry Fee Box on left + JOIN ROOM CTA button in PURPLE on right */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' }}>
                    {/* Entry Fee Box */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(20, 26, 48, 0.8)',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 218, 243, 0.25)',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 14,
                    }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0, 218, 243, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="cash-outline" size={16} color="#00daf3" />
                      </View>
                      <View>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>ENTRY FEE</Text>
                        <Text style={{ color: '#00daf3', fontSize: 13, fontWeight: '900', fontFamily: 'Inter, sans-serif' }}>100 ETB</Text>
                      </View>
                    </View>

                    {/* JOIN ROOM CTA Button in PURPLE */}
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/(authed)/home/spin', params: { mode: "5_PLAYER" } } as any)}
                      activeOpacity={0.85}
                      style={{ borderRadius: 14, overflow: 'hidden', flex: 1, maxWidth: 140 }}
                    >
                      <LinearGradient
                        colors={['#8b5cf6', '#6366f1']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          shadowColor: '#8b5cf6',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.5,
                          shadowRadius: 10,
                          elevation: 6,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>
                          JOIN ROOM
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#ffffff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ================= ORIGINAL XO GAME TAB VIEW ================= */
        <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageContentWrapper}>
            <View style={s.threeColumnRow}>
              {/* 1. LEFT SIDEBAR (fixed width 280px) */}
              {/* 1. LEFT SIDEBAR (split cards) */}
              <View style={[s.leftSidebar, { alignSelf: "stretch" }]}>
                {/* Card 1: User Profile & Balance */}
                <View style={s.card}>
                  <View style={s.userCardHeader}>
                    <View style={s.userCardAvatar}>
                      <Text style={s.userCardAvatarText}>
                        {user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.userCardName} numberOfLines={1}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                      <View style={s.onlineRow}>
                        <View style={s.onlineDot} />
                        <Text style={s.onlineText}>Online</Text>
                      </View>
                    </View>
                  </View>

                  {/* Available Balance card */}
                  <View style={s.tokensRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.tokenLabel}>AVAILABLE BALANCE</Text>
                      <Text style={[s.tokenVal, { color: "#22d3ee" }]}>ETB {balance.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={refreshProfile} style={[s.tokenPlusBtn, { backgroundColor: "#22d3ee" }]} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={12} color="#0a0e1a" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Card 2: Navigation & Wallet */}
                <View style={[s.card, { flex: 1, justifyContent: "space-between" }]}>
                  {/* Vertical Navigation Links */}
                  <View style={{ justifyContent: "center", marginVertical: 10 }}>
                    <TouchableOpacity onPress={() => handleNavClick('home')} style={[s.navItem, s.navItemActive]} activeOpacity={0.8}>
                      <View style={s.navItemActiveBar} />
                      <Ionicons name="home" size={18} color="#8b5cf6" />
                      <Text style={[s.navText, s.navTextActive]}>Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('history')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="time-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>History</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="trophy-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Leaderboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('transactions')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="receipt-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Transactions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="person-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Profile</Text>
                    </TouchableOpacity>

                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                      <TouchableOpacity onPress={() => handleNavClick('admin')} style={s.navItem} activeOpacity={0.8}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#8b93a7" />
                        <Text style={s.navText}>Admin</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Wallet Summary Panel */}
                  <View>
                    <Text style={s.sectionTitleSmall}>WALLET</Text>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Deposit</Text>
                      <Text style={[s.walletValSmall, { color: "#22c55e" }]}>+ 3,420 ETB</Text>
                    </View>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Withdraw</Text>
                      <Text style={[s.walletValSmall, { color: "#ef4444" }]}>- 420 ETB</Text>
                    </View>

                    <View style={s.walletRow}>
                      <Text style={s.walletLabel}>Transactions</Text>
                      <Text style={s.walletValSecond}>12 today</Text>
                    </View>

                    {/* Direct wallet buttons */}
                    <View style={s.walletButtons}>
                      <TouchableOpacity onPress={() => setDepositVisible(true)} style={[s.walletBtnSmall, { borderColor: "#22d3ee" }]} activeOpacity={0.8}>
                        <Text style={[s.walletBtnTextSmall, { color: "#22d3ee" }]}>DEPOSIT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={[s.walletBtnSmall, { borderColor: "#7c3aed" }]} activeOpacity={0.8}>
                        <Text style={[s.walletBtnTextSmall, { color: "#7c3aed" }]}>WITHDRAW</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. CENTER COLUMN */}
              <View style={[s.centerColumn, { flex: 1 }]}>
                {/* The Arena Header */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -0.5, fontFamily: 'Inter, sans-serif' }}>
                    {isEN ? "THE ARENA" : "የጨዋታ ሜዳው"}
                  </Text>
                  <Text style={{ color: '#8b93a7', fontSize: 13, fontWeight: '600', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
                    {isEN ? "Global skill-based competitive matchmaking" : "አለምአቀፍ ክህሎትን መሰረት ያደረገ ተወዳዳሪ ግጥሚያ"}
                  </Text>
                </View>

                {/* Horizontal Quick Actions Row */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  {/* Card 1: Deposit */}
                  <TouchableOpacity onPress={() => setDepositVisible(true)} activeOpacity={0.85} style={s.quickActionCard}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)" }]}><Ionicons name="card-outline" size={22} color="#22d3ee" /></View>
                    <View>
                      <Text style={s.quickActionLabel}>{isEN ? "DEPOSIT" : "ማስገቢያ"}</Text>
                      <Text style={s.quickActionVal}>{isEN ? "Fast Local" : "ፈጣን አማራጮች"}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 2: Withdraw */}
                  <TouchableOpacity onPress={() => setWithdrawVisible(true)} activeOpacity={0.85} style={s.quickActionCard}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}><Ionicons name="arrow-up-circle-outline" size={22} color="#8b5cf6" /></View>
                    <View>
                      <Text style={s.quickActionLabel}>{isEN ? "WITHDRAW" : "ማውጫ"}</Text>
                      <Text style={s.quickActionVal}>{isEN ? "Instant Pay" : "ፈጣን ክፍያ"}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 3: Transaction */}
                  <TouchableOpacity onPress={() => router.push('/(authed)/home/transactions')} activeOpacity={0.85} style={s.quickActionCard}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(34, 197, 94, 0.1)" }]}><Ionicons name="time-outline" size={22} color="#22c55e" /></View>
                    <View>
                      <Text style={s.quickActionLabel}>{isEN ? "TRANSACTION" : "ግብይቶች"}</Text>
                      <Text style={s.quickActionVal}>{isEN ? "Logs" : "ታሪክ"}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Main Game Card */}
                <View style={[s.card, { padding: 32, alignItems: 'center' }]}>
                  <View style={{ flexDirection: isDesktopRow ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 40, width: '100%' }}>
                    <View style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                      <BoardDemo isDesktop={true} />
                    </View>
                    <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' }}>
                      <WebPressable
                        onPress={isBanned || isSearching ? undefined : openRoomSheet}
                        disabled={isBanned || isSearching}
                        style={({ hovered }: { pressed: boolean; hovered: boolean }) => [{
                          borderRadius: 30, overflow: 'hidden', shadowColor: '#22d3ee',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: hovered && !isBanned && !isSearching ? 0.8 : 0.5,
                          shadowRadius: 24, alignSelf: 'stretch',
                        }, (isBanned || isSearching) && { opacity: 0.45 }]}
                      >
                        <LinearGradient
                          colors={isBanned ? ['#203a3a', '#152a2a'] : ['#8b5cf6', '#7c3aed']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1, fontFamily: 'Inter, sans-serif' }}>
                            {isBanned ? (isEN ? 'SUSPENDED' : 'ታግዷል') : isSearching ? (isEN ? 'SEARCHING...' : 'እየፈለገ ነው...') : (isEN ? 'START MATCH' : 'ግጥሚያ ጀምር')}
                          </Text>
                        </LinearGradient>
                      </WebPressable>

                      <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 12, fontFamily: 'Inter, sans-serif' }}>
                        {isEN ? "ENTRY: ETB 10.00" : "መግቢያ፡ 10.00 ብር"}
                      </Text>

                      <WebPressable
                        onPress={() => setFriendModalVisible(true)}
                        style={({ hovered }: { pressed: boolean; hovered: boolean }) => [{
                          marginTop: 16, alignSelf: 'stretch', backgroundColor: 'transparent',
                          borderWidth: 1.5, borderColor: '#7c3aed', borderRadius: 30,
                        }]}
                      >
                        <View style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="people-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1, fontFamily: 'Inter, sans-serif' }}>
                            {isEN ? 'PLAY WITH FRIEND' : 'ከጓደኛ ጋር ይጫወቱ'}
                          </Text>
                        </View>
                      </WebPressable>
                    </View>
                  </View>
                </View>

                {/* Rooms 1-3 moved inside the center column */}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  {/* Card 1: Room 1 */}
                  <View style={[s.bottomRoomCard, { minHeight: 180, padding: 16 }]}>
                    <View style={s.roomHeaderRow}>
                      <View>
                        <Text style={[s.roomLabel, { color: "#8b5cf6" }]}>LOW STAKES</Text>
                        <Text style={[s.roomTitleWhite, { fontSize: 20 }]}>ROOM 1</Text>
                      </View>
                    </View>
                    <View style={[s.roomCenterSection, { marginVertical: 6 }]}>
                      <Text style={[s.playersCountText, { color: "#8b5cf6", fontSize: 28 }]}>10-100</Text>
                      <Text style={s.playersCountLabel}>ETB STAKES</Text>
                    </View>
                    <View style={s.roomBottomSection}>
                      <View>
                        <Text style={s.roomBetLabel}>COMMISSION</Text>
                        <Text style={s.roomBetVal}>10%</Text>
                      </View>
                      <TouchableOpacity onPress={() => { openRoomSheet(); onSelectRoom("R1"); }} style={[s.roomJoinBtn, { backgroundColor: "#8b5cf6", paddingHorizontal: 16, paddingVertical: 8 }]} activeOpacity={0.8}>
                        <Text style={s.roomJoinBtnText}>JOIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card 2: Room 2 */}
                  <View style={[s.bottomRoomCard, s.recommendedRoomCard, { flex: 1.2, minHeight: 180, padding: 16 }]}>
                    <View style={s.roomHeaderRow}>
                      <View style={s.recommendedBadge}>
                        <Text style={s.recommendedBadgeText}>RECOMMENDED</Text>
                      </View>
                    </View>
                    <View style={[s.roomCenterSection, { marginVertical: 6 }]}>
                      <Text style={[s.playersCountText, { color: "#22d3ee", fontSize: 28 }]}>100-1,000</Text>
                      <Text style={s.playersCountLabel}>ETB STAKES</Text>
                    </View>
                    <View style={s.roomBottomSection}>
                      <View>
                        <Text style={s.roomBetLabel}>COMMISSION</Text>
                        <Text style={[s.roomBetVal, { color: "#22d3ee" }]}>10%</Text>
                      </View>
                      <TouchableOpacity onPress={() => { openRoomSheet(); onSelectRoom("R2"); }} style={[s.roomJoinBtn, { backgroundColor: "#22d3ee", paddingHorizontal: 16, paddingVertical: 8 }]} activeOpacity={0.8}>
                        <Text style={[s.roomJoinBtnText, { color: "#0a0e1a" }]}>JOIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card 3: Room 3 */}
                  <View style={[s.bottomRoomCard, { minHeight: 180, padding: 16 }]}>
                    <View style={s.roomHeaderRow}>
                      <View>
                        <Text style={[s.roomLabel, { color: "#06b6d4" }]}>HIGH STAKES</Text>
                        <Text style={[s.roomTitleWhite, { fontSize: 20 }]}>ROOM 3</Text>
                      </View>
                    </View>
                    <View style={[s.roomCenterSection, { marginVertical: 6 }]}>
                      <Text style={[s.playersCountText, { color: "#06b6d4", fontSize: 28 }]}>1,000-10,000</Text>
                      <Text style={s.playersCountLabel}>ETB STAKES</Text>
                    </View>
                    <View style={s.roomBottomSection}>
                      <View>
                        <Text style={s.roomBetLabel}>COMMISSION</Text>
                        <Text style={s.roomBetVal}>10%</Text>
                      </View>
                      <TouchableOpacity onPress={() => { openRoomSheet(); onSelectRoom("R3"); }} style={[s.roomJoinBtn, { backgroundColor: "#06b6d4", paddingHorizontal: 16, paddingVertical: 8 }]} activeOpacity={0.8}>
                        <Text style={s.roomJoinBtnText}>JOIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. RIGHT SIDEBAR (fixed width 320px) */}
              <View style={[s.rightSidebar, { gap: 12 }]}>
                {/* Top leaders card */}
                <View style={s.card}>
                  <View style={s.leaderboardHeader}>
                    <Text style={s.leaderboardTitle}>TOP LEADERS</Text>
                    <Ionicons name="trophy" size={18} color="#f5b642" />
                  </View>
                  <Text style={s.leaderboardStats}>248 online  •  56 friends  •  48 playing</Text>

                  {/* Standings entries */}
                  <View style={s.leadersList}>
                    {weeklyLeaderboard && weeklyLeaderboard.length > 0 ? (
                      weeklyLeaderboard.slice(0, 5).map((lead, idx) => {
                        const rank = idx + 1;
                        const hasCrown = rank === 1;
                        const circleBg = rank === 1 ? "#f5b642" : (rank === 2 ? "#b9cacb" : (rank === 3 ? "#f97316" : (rank === 4 ? "#a855f7" : "#22c55e")));
                        return (
                          <View key={lead.id || idx} style={s.leaderRow}>
                            <View style={[s.leaderBadge, { backgroundColor: circleBg }]}>
                              <Text style={s.leaderBadgeText}>{rank}</Text>
                            </View>
                            <View style={s.leaderDetails}>
                              <Text style={s.leaderName} numberOfLines={1}>@{lead.username || "user"}</Text>
                              <Text style={s.leaderVal}>{lead.wins} Wins</Text>
                            </View>
                            {hasCrown && <Ionicons name="trophy" size={16} color="#f5b642" />}
                          </View>
                        );
                      })
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <Ionicons name="trophy-outline" size={28} color="rgba(255,255,255,0.1)" style={{ marginBottom: 8 }} />
                        <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 13, fontWeight: "600", fontFamily: "Inter, sans-serif" }}>None</Text>
                      </View>
                    )}
                  </View>

                  {/* View Standings */}
                  <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.standingsBtn} activeOpacity={0.8}>
                    <Text style={s.standingsBtnText}>VIEW ALL LEADERS</Text>
                  </TouchableOpacity>
                </View>

                {/* XO Support Card */}
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://t.me/xoet_support').catch(() => { })}
                  activeOpacity={0.85}
                  style={[s.card, { paddingVertical: 14 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)", width: 36, height: 36, borderRadius: 18 }]}><Ionicons name="chatbubbles-outline" size={18} color="#22d3ee" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>XO SUPPORT</Text>
                      <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '600', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Online 24/7 Support Channel</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                  </View>
                </TouchableOpacity>

                {/* XO Channel Card */}
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://t.me/xoethiopia1').catch(() => { })}
                  activeOpacity={0.85}
                  style={[s.card, { paddingVertical: 14 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.quickActionIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.1)", width: 36, height: 36, borderRadius: 18 }]}><Ionicons name="paper-plane-outline" size={18} color="#8b5cf6" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>XO CHANNEL</Text>
                      <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '600', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Join our Telegram channel</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4b5563" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      )}

      {/* Notifications & Invite Modals */}
      <FriendMatchModal
        visible={friendModalVisible}
        onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
        onSendInvite={handleSendInvite}
        inviteResult={inviteResult}
      />
      <PromotionPopup config={promoConfig} visible={showPromo} onClose={() => setShowPromo(false)} />
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />

      {/* Stake Modal */}
      <Modal visible={showStakeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.stakeModalContent}>
            <View style={s.stakeModalHeader}>
              <Text style={s.stakeModalTitle}>
                {isEN ? "CHOOSE YOUR WAGER" : "የእንጨት መጠን ይምረጡ"}
              </Text>
              <TouchableOpacity onPress={() => setShowStakeModal(false)}>
                <Ionicons name="close" size={24} color="#8b93a7" />
              </TouchableOpacity>
            </View>

            <Text style={s.stakeModalDesc}>
              {isEN
                ? "Select a preset chip or enter a custom stake amount to enter the multi-odds XO Spin room."
                : "ቀድሞ የተቀመጠ ቺፕ ይምረጡ ወይም ብጁ የእንጨት መጠን ያስገቡ ወደ XO Spin ክፍል ለመግባት።"}
            </Text>

            {spinError && (
              <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>
                {spinError}
              </Text>
            )}

            {/* Chips selector */}
            <View style={s.chipContainer}>
              {chips.map((chip) => {
                const isActive = stakeAmount === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => {
                      setStakeAmount(chip);
                      setSpinError(null);
                    }}
                    style={[s.chipButton, isActive && s.chipButtonActive]}
                  >
                    <Text style={[s.chipText, isActive && s.chipTextActive]}>
                      {chip} ETB
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Input */}
            <View style={s.customInputWrapper}>
              <Text style={s.customInputLabel}>
                {isEN ? "CUSTOM AMOUNT (ETB)" : "ብጁ መጠን (ETB)"}
              </Text>
              <TextInput
                style={s.customInput}
                value={stakeAmount}
                onChangeText={(val) => {
                  setStakeAmount(val);
                  setSpinError(null);
                }}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            {/* Current Balance */}
            <View style={s.balanceStatusRow}>
              <Text style={s.balanceStatusLabel}>
                {isEN ? "AVAILABLE BALANCE:" : "ያለዎት ቀሪ ሂሳብ:"}
              </Text>
              <Text style={s.balanceStatusValue}>
                ETB {balance.toLocaleString()}
              </Text>
            </View>

            {/* Actions */}
            <View style={s.modalActionRow}>
              <TouchableOpacity onPress={() => setShowStakeModal(false)} style={s.modalCancelBtn}>
                <Text style={s.modalCancelBtnText}>
                  {isEN ? "CANCEL" : "ሰርዝ"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmSpin} style={s.modalConfirmBtn}>
                <Text style={s.modalConfirmBtnText}>
                  {isEN ? "CONFIRM" : "አረጋግጥ"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const getArcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
};

function SpinWheelSvg({
  size,
  faded,
  mode,
  showPointer = true,
  onlyPointer = false,
}: {
  size: number;
  faded?: boolean;
  mode?: "5_PLAYER" | "RAIL";
  showPointer?: boolean;
  onlyPointer?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.40;

  if (onlyPointer) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="35%" stopColor="#fde047" />
            <Stop offset="75%" stopColor="#ca8a04" />
            <Stop offset="100%" stopColor="#854d0e" />
          </RadialGradient>
          <SvgLinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#fde047" />
            <Stop offset="50%" stopColor="#ca8a04" />
            <Stop offset="100%" stopColor="#854d0e" />
          </SvgLinearGradient>
        </Defs>
        <G>
          {/* Outer shadow of pointer */}
          <Path
            d={`M ${cx - size * 0.04} ${cy - r * 1.15} L ${cx + size * 0.04} ${cy - r * 1.15} L ${cx} ${cy - r * 0.95} Z`}
            fill="rgba(0,0,0,0.4)"
          />
          {/* Main pointer body */}
          <Path
            d={`M ${cx - size * 0.035} ${cy - r * 1.18} L ${cx + size * 0.035} ${cy - r * 1.18} L ${cx} ${cy - r * 0.98} Z`}
            fill="url(#goldGrad)"
            stroke="#78350f"
            strokeWidth={1.5}
          />
          {/* Inner highlights */}
          <Path
            d={`M ${cx - size * 0.015} ${cy - r * 1.16} L ${cx + size * 0.015} ${cy - r * 1.16} L ${cx} ${cy - r * 1.02} Z`}
            fill="#fef08a"
            opacity={0.7}
          />
        </G>
      </Svg>
    );
  }

  let sectors = [];
  if (mode === "RAIL") {
    sectors = [
      { value: "15%", color: "#a855f7", angle: 54 },
      { value: "25%", color: "#22c55e", angle: 90 },
      { value: "10%", color: "#22d3ee", angle: 36 },
      { value: "35%", color: "#f97316", angle: 126 },
      { value: "15%", color: "#ef4444", angle: 54 },
    ];
  } else {
    sectors = [
      { value: "20%", color: "#a855f7", angle: 72 },
      { value: "20%", color: "#22c55e", angle: 72 },
      { value: "20%", color: "#22d3ee", angle: 72 },
      { value: "20%", color: "#f97316", angle: 72 },
      { value: "20%", color: "#ef4444", angle: 72 },
    ];
  }

  let accumulatedAngle = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: faded ? 0.35 : 1 }}>
      <Defs>
        <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <Stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
          <Stop offset="70%" stopColor="#a855f7" stopOpacity={0.15} />
          <Stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="35%" stopColor="#fde047" />
          <Stop offset="75%" stopColor="#ca8a04" />
          <Stop offset="100%" stopColor="#854d0e" />
        </RadialGradient>
        <SvgLinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#fde047" />
          <Stop offset="50%" stopColor="#ca8a04" />
          <Stop offset="100%" stopColor="#854d0e" />
        </SvgLinearGradient>
      </Defs>

      {/* Wheel shadow/glow background */}
      {!faded && <Circle cx={cx} cy={cy} r={r * 1.4} fill="url(#wheelGlow)" />}

      {/* Outer Dark Rim Background */}
      <Circle cx={cx} cy={cy} r={r * 1.09} fill="#0d0e1b" stroke="url(#goldGrad)" strokeWidth={3} />

      {/* Slices */}
      <G>
        {sectors.map((sec, idx) => {
          const startAngle = accumulatedAngle;
          const endAngle = accumulatedAngle + sec.angle;
          accumulatedAngle = endAngle;
          const textAngle = startAngle + sec.angle / 2;
          const textPos = polarToCartesian(cx, cy, r * 0.65, textAngle);
          return (
            <G key={idx}>
              <Path d={getArcPath(cx, cy, r, startAngle, endAngle)} fill={sec.color} stroke="#0d0e1b" strokeWidth={2} />
              {!faded && (
                <SvgText
                  x={textPos.x}
                  y={textPos.y}
                  fill="#ffffff"
                  fontSize={size * 0.05}
                  fontWeight="900"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {sec.value}
                </SvgText>
              )}
            </G>
          );
        })}
      </G>

      {/* Inner gold divider ring */}
      <Circle cx={cx} cy={cy} r={r} stroke="url(#goldGrad)" strokeWidth={4} fill="none" />

      {/* Outer gold rim ring with lights */}
      <Circle cx={cx} cy={cy} r={r * 1.04} stroke="url(#goldGrad)" strokeWidth={size * 0.06} fill="none" />

      {/* Glowing Bulbs / Lights on the rim */}
      {!faded && (
        <G>
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = i * (360 / 18);
            const pos = polarToCartesian(cx, cy, r * 1.04, angle);
            // Alternate colors for standard arcade flashing effect
            const isYellow = i % 2 === 0;
            return (
              <G key={i}>
                {/* Glow ring */}
                <Circle cx={pos.x} cy={pos.y} r={size * 0.018} fill={isYellow ? "#ca8a04" : "#ec4899"} opacity={0.4} />
                <Circle cx={pos.x} cy={pos.y} r={size * 0.010} fill={isYellow ? "#fef08a" : "#fbcfe8"} />
              </G>
            );
          })}
        </G>
      )}

      {/* Center 3D gold hub */}
      <Circle cx={cx} cy={cy} r={r * 0.19} fill="url(#goldGrad)" />
      <Circle cx={cx} cy={cy} r={r * 0.15} fill="url(#centerHubGrad)" stroke="#78350f" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={r * 0.06} fill="#ffffff" opacity={0.3} />

      {/* Pointer at the top pointing down */}
      {!faded && showPointer && (
        <G>
          {/* Outer shadow of pointer */}
          <Path
            d={`M ${cx - size * 0.04} ${cy - r * 1.15} L ${cx + size * 0.04} ${cy - r * 1.15} L ${cx} ${cy - r * 0.95} Z`}
            fill="rgba(0,0,0,0.4)"
          />
          {/* Main pointer body */}
          <Path
            d={`M ${cx - size * 0.035} ${cy - r * 1.18} L ${cx + size * 0.035} ${cy - r * 1.18} L ${cx} ${cy - r * 0.98} Z`}
            fill="url(#goldGrad)"
            stroke="#78350f"
            strokeWidth={1.5}
          />
          {/* Inner highlights */}
          <Path
            d={`M ${cx - size * 0.015} ${cy - r * 1.16} L ${cx + size * 0.015} ${cy - r * 1.16} L ${cx} ${cy - r * 1.02} Z`}
            fill="#fef08a"
            opacity={0.7}
          />
        </G>
      )}
    </Svg>
  );
}

const s = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#060713",
    ...(Platform.OS === 'web' ? { height: "100vh", overflow: "hidden", width: "100%" } as any : {}),
  },

  // Header Style (Larger scale)
  header: {
    height: 88,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2540",
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  headerContentWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#7c3aed",
  },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Center toggle tabs
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#12172a",
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  toggleBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#7c3aed" },
  toggleBtnText: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  toggleBtnTextActive: { color: "#ffffff" },

  // Right Cluster
  utilityCluster: { flexDirection: "row", alignItems: "center", gap: 14 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 8,
  },
  balanceLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginRight: 10, fontFamily: "Inter, sans-serif" },
  balanceVal: { color: "#22d3ee", fontSize: 15, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  refreshBtn: { marginLeft: 10, padding: 4 },

  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#12172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  utilityBtnText: { color: "#8b93a7", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", fontFamily: "Inter, sans-serif" },

  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 11, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Desktop tab bar
  desktopTabBar: {
    flexDirection: "row",
    backgroundColor: "#12172a",
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  desktopTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 16,
  },
  desktopTabBtnActive: {
    backgroundColor: "#7c3aed",
    ...(Platform.OS === 'web' ? {
      background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
      boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)"
    } as any : {}),
  },
  desktopTabBtnText: {
    color: "#8b93a7",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  desktopTabBtnTextActive: {
    color: "#ffffff",
  },

  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#12172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  walletIndicatorBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22d3ee",
  },
  walletBalanceText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  langSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#12172a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langSelectBtnText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },

  pageContentWrapper: {
    maxWidth: "100%",
    alignSelf: "stretch",
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  threeColumnRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 24,
    width: "100%",
  },
  leftSidebar: {
    width: 290,
    gap: 16,
  },
  card: {
    backgroundColor: "#12172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  userCardAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  userCardName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  onlineText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  tokensRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(34, 211, 238, 0.04)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.08)",
  },
  tokenLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  tokenVal: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  tokenPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    position: "relative",
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "rgba(124, 58, 237, 0.08)",
  },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#7c3aed",
  },
  navText: {
    color: "#8b93a7",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  navTextActive: {
    color: "#fff",
  },

  sectionTitleSmall: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: "Inter, sans-serif",
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  walletLabel: {
    color: "#8b93a7",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
  },
  walletValSmall: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  walletValSecond: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  walletButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  walletBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnTextSmall: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },

  // Center column
  centerColumn: { flex: 1, gap: 20 },
  quickActionsRow: { flexDirection: "row", gap: 20 },
  quickActionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#12172a",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  quickActionCardGlow: {
    borderColor: "rgba(34, 211, 238, 0.4)",
    ...Platform.select({ web: { boxShadow: "0 0 20px rgba(34, 211, 238, 0.08)" } as any }),
  },
  quickActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  quickActionVal: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 2, fontFamily: "Inter, sans-serif" },

  // Hero Lucky Spin Card
  heroSpinCard: {
    backgroundColor: "#0d0d21",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.4)",
    padding: 36,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    ...Platform.select({ web: { boxShadow: "0 15px 35px rgba(139, 92, 246, 0.25)" } as any }),
  },
  heroSubLabel: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Inter, sans-serif" },
  heroTitle: { color: "#fff", fontSize: 54, fontWeight: "900", letterSpacing: -1.5, marginTop: 6, marginBottom: 14, fontFamily: "Inter, sans-serif" },
  carouselRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 30, width: "100%", marginVertical: 14 },

  // Spin button
  spinBtn: {
    marginTop: 20,
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 320,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    ...(Platform.OS === 'web' ? {
      background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
      boxShadow: "0 8px 25px rgba(124, 58, 237, 0.5)"
    } as any : {}),
  },
  spinBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  },

  // Right sidebar
  rightSidebar: {
    width: 310,
    gap: 16,
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leaderboardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  leaderboardStats: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 12,
  },
  leadersList: {
    flex: 1,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2540",
  },
  leaderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  leaderBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  leaderDetails: {
    flex: 1,
  },
  leaderName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  leaderVal: {
    color: "#8b93a7",
    fontSize: 10,
    marginTop: 1,
  },
  standingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1220",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  standingsBtnText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Bottom row room cards
  bottomRow: { flexDirection: "row", gap: 20 },
  bottomRoomCard: {
    flex: 1,
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 20,
    justifyContent: "space-between",
    minHeight: 200,
  },
  recommendedRoomCard: {
    borderColor: "rgba(34, 211, 238, 0.4)",
    ...Platform.select({ web: { boxShadow: "0 0 25px rgba(34, 211, 238, 0.1)" } as any }),
  },
  roomHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  roomLabel: { color: "#22c55e", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Inter, sans-serif" },
  roomTitleWhite: { color: "#ffffff", fontSize: 24, fontWeight: "900", letterSpacing: -0.2, textTransform: "uppercase", fontFamily: "Inter, sans-serif" },
  roomTitleGray: { color: "#8b93a7", fontSize: 24, fontWeight: "900", letterSpacing: -0.2, textTransform: "uppercase", fontFamily: "Inter, sans-serif" },
  roomNavRow: { flexDirection: "row", gap: 6 },
  roomNavArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0d1220",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  roomCenterSection: { alignItems: "center", marginVertical: 10, position: "relative" },
  playersCountText: { color: "#22d3ee", fontSize: 54, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  playersCountLabel: { color: "#8b93a7", fontSize: 11, fontWeight: "800", marginTop: 2, letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  playersIconWrap: {
    position: "absolute",
    right: 12,
    bottom: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedBadge: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: "rgba(34, 211, 238, 0.2)",
  },
  recommendedBadgeText: { color: "#22d3ee", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveTextSmall: { color: "#8b93a7", fontSize: 10, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter, sans-serif" },
  roomBottomSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roomBetLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  roomBetVal: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 2, fontFamily: "Inter, sans-serif" },
  roomJoinBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  roomJoinBtnText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Stake Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 7, 16, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  stakeModalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#0d1220",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  stakeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  stakeModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  stakeModalDesc: {
    color: "#8b93a7",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: "Inter, sans-serif",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chipButton: {
    backgroundColor: "#121829",
    borderWidth: 1,
    borderColor: "#1f2540",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipButtonActive: {
    borderColor: "#22d3ee",
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  chipText: {
    color: "#8b93a7",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  chipTextActive: {
    color: "#22d3ee",
  },
  customInputWrapper: {
    marginBottom: 20,
  },
  customInputLabel: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: "Inter, sans-serif",
  },
  customInput: {
    backgroundColor: "#121829",
    borderWidth: 1,
    borderColor: "#1f2540",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  balanceStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(34, 211, 238, 0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.1)",
  },
  balanceStatusLabel: {
    color: "#8b93a7",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter, sans-serif",
  },
  balanceStatusValue: {
    color: "#22d3ee",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1f2540",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    color: "#8b93a7",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#22d3ee",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnText: {
    color: "#0a0e1a",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
});
