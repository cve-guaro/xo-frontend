import { API_URL } from "../../../config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Image,
  ScrollView,
} from "react-native";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { WebPressable } from "../../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import ProfileEditModal from "../../../components/ProfileEditModal";
import DesktopHeader from "../../../components/game/DesktopHeader";
import DesktopSidebar from "../../../components/game/DesktopSidebar";
import ReferralModal from "../../../components/ReferralModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import CongratulationsModal from "../../../components/CongratulationsModal";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { SkeletonRow } from "../../../components/SkeletonLoading";

// ---- Types ----
type LeaderboardUser = {
  id: string;
  username: string;
  avatar: string | null;
  wins: number;
  winAmount?: number;
  total?: number;
  rank: number;
  isMe: boolean;
};

type PreviousWeekWin = {
  snapshotId: string;
  rank: number;
  prize: number;
  weekStart: string;
  weekEnd: string;
} | null;

// ---- Reset Countdown Component ----
function CountdownTimer({ secondsRemaining: initialSeconds, isEN }: { secondsRemaining: number; isEN: boolean }) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <View style={s.countdownCard}>
      <View style={s.countdownHeaderRow}>
        <Ionicons name="time-outline" size={14} color="#22d3ee" />
        <Text style={s.countdownHeaderTitle}>
          {isEN ? "WEEKLY GIVEAWAY RESET" : "ሳምንታዊ ሽልማት መለኪያ"}
        </Text>
      </View>
      <View style={s.countdownDigitsRow}>
        {/* Days */}
        <View style={s.digitBlock}>
          <Text style={s.digitText}>{String(days).padStart(2, '0')}</Text>
          <Text style={s.digitLabel}>{isEN ? "DAYS" : "ቀናት"}</Text>
        </View>
        <Text style={s.digitDivider}>:</Text>
        {/* Hours */}
        <View style={s.digitBlock}>
          <Text style={s.digitText}>{String(hours).padStart(2, '0')}</Text>
          <Text style={s.digitLabel}>{isEN ? "HRS" : "ሰዓት"}</Text>
        </View>
        <Text style={s.digitDivider}>:</Text>
        {/* Minutes */}
        <View style={s.digitBlock}>
          <Text style={s.digitText}>{String(minutes).padStart(2, '0')}</Text>
          <Text style={s.digitLabel}>{isEN ? "MIN" : "ደቂቃ"}</Text>
        </View>
        <Text style={s.digitDivider}>:</Text>
        {/* Seconds */}
        <View style={s.digitBlock}>
          <Text style={s.digitText}>{String(seconds).padStart(2, '0')}</Text>
          <Text style={s.digitLabel}>{isEN ? "SEC" : "ሰከንድ"}</Text>
        </View>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;

  const { user, token, language, refreshProfile, switchLanguage } = useAuth();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { onMessage } = useSocket();
  const myId = user?.id ?? null;
  const isEN = language === "en";

  // Sidebar navigation helpers
  const handleNavClick = (screen: string) => {
    if (screen === 'home') {
      router.push('/(authed)/home/gameplay');
    } else if (screen === 'history') {
      router.push('/(authed)/home/history');
    } else if (screen === 'leaderboard') {
      router.push('/(authed)/home/leaderboard');
    } else if (screen === 'profile') {
      router.push('/(authed)/home/account');
    } else if (screen === 'transactions') {
      router.push('/(authed)/home/transactions');
    } else if (screen === 'admin') {
      router.push('/admin');
    }
  };

  const handleLanguageToggle = useCallback(() => {
    switchLanguage?.();
  }, [switchLanguage]);

  // States
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [top3, setTop3] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);

  // Weekly metadata states
  const [weeklyPrizes, setWeeklyPrizes] = useState<{ rank: number; amount: number }[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [previousWeekWin, setPreviousWeekWin] = useState<PreviousWeekWin>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(1200);
  const [isLeaderboardDisabled, setIsLeaderboardDisabled] = useState(false);

  // Timeframe filters
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"weekly" | "alltime">("weekly");

  // Modals visibility
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isScrolledPastTop, setIsScrolledPastTop] = useState(false);

  // Fetch weekly metadata for reset countdown and prizes pool
  const fetchWeeklyMetadata = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/leaderboard/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enabled === false) {
          setIsLeaderboardDisabled(true);
          return;
        }
        setIsLeaderboardDisabled(false);
        setWeeklyPrizes(data.prizes || []);
        setSecondsRemaining(data.secondsRemaining || 0);
        setTotalParticipants(data.total || 1200);
        if (data.previousWeekWin) {
          setPreviousWeekWin(data.previousWeekWin);
          setShowCongrats(true);
        }
      }
    } catch (e) {
      console.error("Weekly metadata fetch error:", e);
    }
  }, [token]);

  // Fetch timeframe leaderboard (monthly or alltime)
  const fetchLeaderboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/leaderboard/${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enabled === false) {
          setIsLeaderboardDisabled(true);
          return;
        }
        setIsLeaderboardDisabled(false);
        setLeaderboard(data.leaderboard || []);
        setTop3(data.top3 || []);
        setMyRank(data.myRank || null);
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token, timeframe]);

  useEffect(() => {
    fetchWeeklyMetadata();
  }, [fetchWeeklyMetadata]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Handle balance updates via websocket
  useEffect(() => {
    const unsub = onMessage(({ type }) => {
      if (type === "balance_update") {
        fetchWeeklyMetadata();
        fetchLeaderboardData();
      }
    });
    return unsub;
  }, [onMessage, fetchWeeklyMetadata, fetchLeaderboardData]);

  const handleClaimPrize = async () => {
    setShowCongrats(false);
    if (!previousWeekWin || !token) return;
    try {
      await fetch(`${API_URL}/leaderboard/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotId: previousWeekWin.snapshotId }),
      });
      setPreviousWeekWin(null);
    } catch (e) {
      console.error('Failed to claim prize:', e);
    }
  };

  // Podium Positions Calculation
  const podiumData = useMemo(() => {
    const defaultPodium = [
      { id: "2", username: "Abram Mango", wins: 72, total: 100, rank: 2, isMe: false, avatar: null },
      { id: "1", username: "Kianna Tori", wins: 60, total: 85, rank: 1, isMe: false, avatar: null },
      { id: "3", username: "Alfonso Labin", wins: 63, total: 89, rank: 3, isMe: false, avatar: null },
    ];
    if (top3.length === 0) return defaultPodium;
    // Map Top 3 to Podium Positions: [2nd, 1st, 3rd]
    const first = top3[0] || null;
    const second = top3[1] || null;
    const third = top3[2] || null;

    return [
      second || defaultPodium[0],
      first || defaultPodium[1],
      third || defaultPodium[2],
    ];
  }, [top3]);

  // First place prize value
  const topPrize = weeklyPrizes.find(p => p.rank === 1)?.amount || 500;

  if (isLargeScreen) {
    // ─── HIGH FIDELITY DESKTOP WIDESCREEN LAYOUT ───
    return (
      <View style={s.rootContainer}>
        {/* Dark background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0e1a" }]} />

        {/* Modals */}
        <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
        <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />
        <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
        <CongratulationsModal visible={showCongrats} previousWeekWin={previousWeekWin} onDismiss={handleClaimPrize} isEN={isEN} />
        <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

        {/* ── HEADER BAR ── */}
        <DesktopHeader
          user={user}
          language={language}
          handleLanguageToggle={handleLanguageToggle}
          selectedTab="XO_GAME"
          setPwaModalVisible={setPwaModalVisible}
          bgMusicPlaying={isPlaying}
          onToggleSound={toggleMusic}
          unreadCount={unreadCount}
          setNotificationsVisible={setNotificationsVisible}
          router={router}
        />

        {/* ── CORE BODY CONTAINER (Sticky sidebars, Center-only scrolling) ── */}
        <View style={s.desktopLayoutContainer}>
          {/* 1. LEFT SIDEBAR */}
          <DesktopSidebar
            user={user}
            balance={Number(user?.available_balance || 0)}
            currentScreen="leaderboard"
            refreshProfile={refreshProfile}
            setDepositVisible={setDepositVisible}
            setWithdrawVisible={setWithdrawVisible}
            router={router}
          />

          {/* 2. CENTER COLUMN (Scrolls independently while sidebars remain sticky) */}
            <ScrollView
              style={s.centerScrollContainer}
              contentContainerStyle={s.centerScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={s.centerColumn}>
                {isLeaderboardDisabled ? (
                  <View style={{
                    backgroundColor: "#161b2e",
                    borderRadius: 16,
                    padding: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    marginTop: 20,
                  }}>
                    <Ionicons name="construct-outline" size={54} color="#f59e0b" style={{ marginBottom: 16 }} />
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
                      Leaderboard Under Maintenance
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", maxWidth: 420, lineHeight: 22, marginBottom: 24 }}>
                      The Leaderboard feature is temporarily offline for maintenance. Your wins continue to be tracked in real-time and rankings will resume shortly.
                    </Text>
                    <TouchableOpacity
                      onPress={() => { fetchWeeklyMetadata(); fetchLeaderboardData(); }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#f59e0b",
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 10,
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh" size={16} color="#000" style={{ marginRight: 8 }} />
                      <Text style={{ color: "#000", fontWeight: "700", fontSize: 14 }}>Refresh Status</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                {/* Title and Filter Row */}
                <View style={s.titleRowContainer}>
                  <View>
                    <Text style={s.mainTitle}>LEADERBOARD</Text>
                    <Text style={s.subTitle}>Top players this month</Text>
                  </View>

                  {/* Filter Dropdown */}
                  <View style={{ zIndex: 100 }}>
                    <TouchableOpacity onPress={() => setDropdownOpen(!dropdownOpen)} style={s.filterDropdown} activeOpacity={0.85}>
                      <Ionicons name="calendar-outline" size={14} color="#8b93a7" style={{ marginRight: 6 }} />
                      <Text style={s.filterDropdownText}>
                        {timeframe === "weekly" ? "Weekly" : "All Time"}
                      </Text>
                      <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#8b93a7" />
                    </TouchableOpacity>
                    {dropdownOpen && (
                      <View style={s.dropdownMenu}>
                        <TouchableOpacity onPress={() => { setTimeframe("weekly"); setDropdownOpen(false); }} style={s.dropdownItem}>
                          <Text style={s.dropdownItemText}>Weekly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setTimeframe("alltime"); setDropdownOpen(false); }} style={s.dropdownItem}>
                          <Text style={s.dropdownItemText}>All Time</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* PODIUM VISUAL */}
                <View style={s.podiumRow}>
                  {podiumData.map((item, idx) => {
                    const isWinner = item.rank === 1;
                    const isThird = item.rank === 3;
                    const blockH = isWinner ? 110 : (isThird ? 75 : 90);
                    const blockColor = isWinner ? "#111827" : "#111827";
                    const winAmt = (item as any).winAmount !== undefined && (item as any).winAmount !== null ? (item as any).winAmount : item.wins * 50;
                    const winnings = `${item.wins} Wins`;
                    const initials = item.username ? item.username.slice(0, 2).toUpperCase() : "ME";

                    return (
                      <View key={item.id || idx} style={s.podiumSpotContainer}>
                        {/* Crown/Trophy above first place */}
                        {isWinner && (
                          <View style={s.crownFloatingIcon}>
                            <Ionicons name="ribbon" size={24} color="#f5b642" />
                          </View>
                        )}

                        {/* Player details above block */}
                        <View style={s.podiumPlayerDetails}>
                          <View style={[s.podiumAvatarCircle, { borderColor: isWinner ? "#f5b642" : "#1f2540" }]}>
                            {item.avatar ? (
                              <Image source={{ uri: item.avatar }} style={s.podiumAvatarImg} />
                            ) : (
                              <Text style={s.podiumAvatarText}>{initials}</Text>
                            )}
                          </View>
                          <Text style={s.podiumPlayerName} numberOfLines={1}>{item.username}</Text>
                          <View style={s.podiumPrizePill}>
                            <Text style={s.podiumPrizeText}>{winnings}</Text>
                          </View>
                        </View>

                        {/* Raised 3D block */}
                        <View style={[s.podiumBlock, { height: blockH, backgroundColor: blockColor, borderColor: isWinner ? "#F5B642" : "#233041", borderWidth: isWinner ? 2 : 1 }]}>
                          <Text style={[s.podiumNumberText, { fontSize: 32 }]}>{item.rank}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* LEADERBOARD LIST CARD */}
                <View style={s.card}>
                  <View style={s.leaderboardListHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="trophy-outline" size={16} color="#00BFFF" />
                      <Text style={s.leaderboardListTitle}>Weekly Leaderboard</Text>
                    </View>

                    {/* Toggle Pill inside Card */}
                    <View style={s.timeframeTogglePillContainer}>
                      <TouchableOpacity 
                        onPress={() => setTimeframe("weekly")} 
                        style={[s.togglePillBtn, timeframe === "weekly" && s.togglePillBtnActive]}
                      >
                        <Text style={[s.togglePillBtnText, timeframe === "weekly" && s.togglePillBtnTextActive]}>Weekly</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setTimeframe("alltime")} 
                        style={[s.togglePillBtn, timeframe === "alltime" && s.togglePillBtnActive]}
                      >
                        <Text style={[s.togglePillBtnText, timeframe === "alltime" && s.togglePillBtnTextActive]}>All Time</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Leaderboard List Rows (Full listing without nested ScrollView trap) */}
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {loading && (
                      <View style={{ gap: 8 }}>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </View>
                    )}
                    {!loading && leaderboard.length === 0 && (
                      <Text style={s.emptyListText}>No rankings available yet.</Text>
                    )}
                    {!loading && leaderboard.map((item, idx) => {
                      const isTop3 = item.rank <= 3;
                      const badgeBg = item.rank === 1 ? "#f5b642" : (item.rank === 2 ? "#b9cacb" : (item.rank === 3 ? "#fb923c" : "rgba(0, 191, 255, 0.15)"));
                      const badgeTextCol = isTop3 ? "#0a0e1a" : "#00BFFF";
                      const winAmt = item.winAmount !== undefined && item.winAmount !== null ? item.winAmount : item.wins * 50;
                      const winnings = `${item.wins} Wins`;
                      const totalGamesCount = item.total || Math.round(item.wins * 1.5);
                      const isMe = item.isMe;

                      return (
                        <View key={item.id} style={[s.rankRowContainer, isMe && s.rankRowContainerMe]}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                            {/* Rank Badge */}
                            <View style={[s.rankBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[s.rankBadgeText, { color: badgeTextCol }]}>{item.rank}</Text>
                            </View>

                            {/* Avatar */}
                            <View style={s.rankRowAvatar}>
                              {item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={s.rankRowAvatarImg} />
                              ) : (
                                <Text style={s.rankRowAvatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
                              )}
                            </View>

                            {/* Info */}
                            <View>
                              <Text style={s.rankRowName}>{item.username} {isMe && "(You)"}</Text>
                              <Text style={s.rankRowStats}>Win Battles won: {item.wins} / {totalGamesCount}</Text>
                            </View>
                          </View>

                          {/* PNL / Wins */}
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={s.rankRowPnlLabel}>Wins</Text>
                            <Text style={s.rankRowPnlVal}>{winnings}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
                </>
                )}
              </View>
            </ScrollView>

            {/* 3. RIGHT SIDEBAR — GIVEAWAY resetting details (sticky) */}
            <ScrollView
              style={s.stickySidebarScrollRight}
              contentContainerStyle={{ gap: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={s.rightSidebar}>
                {/* 1. Reset Countdown Timer Card */}
                <CountdownTimer secondsRemaining={secondsRemaining} isEN={isEN} />

                {/* 2. Prize Pool Card */}
                <View style={[s.card, { marginTop: 20 }]}>
                  <View style={s.prizeHeaderRow}>
                    <Ionicons name="trophy" size={16} color="#f5b642" style={{ marginRight: 8 }} />
                    <Text style={s.prizeHeaderTitle}>WEEKLY PRIZE POOL</Text>
                  </View>

                  <Text style={s.prizeBigAmount}>{topPrize} BIRR</Text>
                  <Text style={s.prizeSubtext}>For the 1st Place Winner</Text>

                  {/* Avatar list stack */}
                  <View style={s.avatarStackRow}>
                    <View style={s.avatarStackContainer}>
                      <View style={[s.stackAvatar, { backgroundColor: "#00BFFF", zIndex: 3 }]}>
                        <Text style={s.stackAvatarText}>K</Text>
                      </View>
                      <View style={[s.stackAvatar, { backgroundColor: "#FF1744", zIndex: 2, marginLeft: -10 }]}>
                        <Text style={s.stackAvatarText}>A</Text>
                      </View>
                      <View style={[s.stackAvatar, { backgroundColor: "#06b6d4", zIndex: 1, marginLeft: -10 }]}>
                        <Text style={s.stackAvatarText}>M</Text>
                      </View>
                    </View>
                    <Text style={s.joiningCountText}>+{totalParticipants} Players joining</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
        </View>
      </View>
    );
  }

  // ─── MOBILE VIEW LAYOUT ───
  return (
    <View style={s.rootContainer}>
      <LinearGradient colors={["#0c0c1f", "#070714"]} style={StyleSheet.absoluteFill} />
      
      {/* Mobile Header */}
      <View style={s.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.mobileBackBtn}>
          <Ionicons name="arrow-back" size={20} color="#00daf3" />
        </TouchableOpacity>
        <Text style={s.mobileTitleText}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sticky Compact Header (Image 5 right side style) - shown when user scrolls past top section */}
      {isScrolledPastTop && (
        <View style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: '#0c0f24',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        }}>
          {/* Left: Compact Timer (Image 5 style) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#00daf3', fontSize: 13, fontWeight: '900', fontFamily: 'Inter, sans-serif' }}>
              {String(Math.floor(secondsRemaining / 86400)).padStart(2, '0')} : {String(Math.floor((secondsRemaining % 86400) / 3600)).padStart(2, '0')} : {String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, '0')} : {String(secondsRemaining % 60).padStart(2, '0')}
            </Text>
          </View>

          {/* Right: Compact Top 3 Badges (Image 5 style) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {podiumData.slice(0, 3).map((p, idx) => {
              const badgeBg = p.rank === 1 ? '#00BFFF' : '#1e243d';
              const nameText = p.username ? p.username.slice(0, 5) : 'User';
              return (
                <View key={p.id || idx} style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: badgeBg,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 42,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }} numberOfLines={1}>{nameText}</Text>
                  <Text style={{ color: '#00daf3', fontSize: 8, fontWeight: '900' }}>#{p.rank}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: isScrolledPastTop ? 60 : 0 }}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            setIsScrolledPastTop(offsetY > 180);
          }}
          scrollEventThrottle={16}
          ListHeaderComponent={() => (
            <View style={{ marginTop: 16 }}>
              {/* Countdown at top of mobile list */}
              <View style={{ marginBottom: 20 }}>
                <CountdownTimer secondsRemaining={secondsRemaining} isEN={isEN} />
              </View>

              {/* Mobile Podium */}
              <View style={[s.podiumRow, { marginHorizontal: 0, marginBottom: 24 }]}>
                {podiumData.map((item, idx) => {
                  const isWinner = item.rank === 1;
                  const blockH = isWinner ? 120 : 90;
                  const initials = item.username ? item.username.slice(0, 2).toUpperCase() : "PL";
                  return (
                    <View key={item.id || idx} style={s.podiumSpotContainer}>
                      <View style={s.podiumPlayerDetails}>
                        <View style={[s.podiumAvatarCircle, { width: isWinner ? 48 : 38, height: isWinner ? 48 : 38 }]}>
                          <Text style={[s.podiumAvatarText, { fontSize: isWinner ? 12 : 10 }]}>{initials}</Text>
                        </View>
                        <Text style={[s.podiumPlayerName, { fontSize: 11 }]} numberOfLines={1}>{item.username}</Text>
                        <Text style={{ color: "#f5b642", fontSize: 10, fontWeight: "800", marginTop: 2 }}>{item.wins} Wins</Text>
                      </View>
                      <View style={[s.podiumBlock, { height: blockH, backgroundColor: "#111827", borderColor: isWinner ? "#F5B642" : "#233041", borderWidth: isWinner ? 2 : 1, paddingVertical: 8 }]}>
                        <Text style={[s.podiumNumberText, { fontSize: isWinner ? 24 : 18 }]}>{item.rank}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const isTop3 = item.rank <= 3;
            const badgeBg = item.rank === 1 ? "#f5b642" : (item.rank === 2 ? "#b9cacb" : (item.rank === 3 ? "#fb923c" : "rgba(255,255,255,0.06)"));
            const badgeTextCol = isTop3 ? "#0a0e1a" : "rgba(255,255,255,0.4)";
            return (
              <View style={[s.rankRowContainer as any, { marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[s.rankBadge as any, { width: 28, height: 28, borderRadius: 14, backgroundColor: badgeBg }]}>
                    <Text style={[s.rankBadgeText as any, { color: badgeTextCol, fontSize: 12 }]}>{item.rank}</Text>
                  </View>
                  <View>
                    <Text style={s.rankRowName as any}>{item.username}</Text>
                    <Text style={s.rankRowStats as any}>{item.wins} wins battles won</Text>
                  </View>
                </View>
                <Text style={{ color: "#22d3ee", fontWeight: "900", fontSize: 13 }}>{item.wins} Wins</Text>
              </View>
            );
          }}
        />
      )}
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />
    </View>
  );
}

const s = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#0a0e1a" },

  // Header Style (Same as gameplay & history headers)
  header: {
    height: 88,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#00BFFF",
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
  toggleBtnActive: { backgroundColor: "#00BFFF" },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileChipAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Scroll View & Layout blueprints
  desktopLayoutContainer: {
    flex: 1,
    width: "100%",
    height: Platform.OS === "web" ? ("calc(100vh - 72px)" as any) : undefined,
    maxHeight: Platform.OS === "web" ? ("calc(100vh - 72px)" as any) : undefined,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: "row",
    gap: 28,
    alignItems: "stretch",
    overflow: "hidden",
  },
  stickySidebarScrollLeft: {
    width: 280,
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  stickySidebarScrollRight: {
    width: 320,
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  centerScrollContainer: {
    flex: 1,
    height: "100%",
    maxHeight: "100%",
  },
  centerScrollContent: {
    paddingBottom: 48,
    gap: 20,
  },
  mainScrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 40, paddingVertical: 24, gap: 24 },
  pageContentWrapper: {
    width: "100%",
    gap: 24,
  },
  threeColumnRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", width: "100%" },

  // Sidebar Layout (Same as gameplay & history left sidebars)
  leftSidebar: { width: 280, gap: 20 },
  card: {
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 20,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 30px rgba(0,0,0,0.15)" } as any : {}),
  },
  userCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  userCardAvatarText: { color: "#fff", fontSize: 16, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  userCardName: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  onlineText: { color: "#8b93a7", fontSize: 11, fontWeight: "500", fontFamily: "Inter, sans-serif" },
  
  tokensRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1220",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  tokenLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  tokenVal: { color: "#f5b642", fontSize: 15, fontWeight: "800", marginTop: 2, fontFamily: "Inter, sans-serif" },
  tokenPlusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },

  // Vertical navigation
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    position: "relative",
  },
  navItemActive: { backgroundColor: "rgba(0, 191, 255, 0.08)" },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    backgroundColor: "#00BFFF",
    borderRadius: 2,
  },
  navText: { color: "#8b93a7", fontSize: 14, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  navTextActive: { color: "#e5e3ff" },

  // Wallet
  sectionTitleSmall: { color: "#8b93a7", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14, fontFamily: "Inter, sans-serif" },
  walletRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  walletLabel: { color: "#8b93a7", fontSize: 12, fontWeight: "500", fontFamily: "Inter, sans-serif" },
  walletValSmall: { fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  walletValSecond: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  walletButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  walletBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnTextSmall: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Sidebar bottom profile card styles
  verifiedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 218, 243, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  rechargeBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },
  rechargeBtnText: { color: "#0a0e1a", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
  },
  logoutBtnText: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "800", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" },

  // Center column
  centerColumn: { flex: 1, gap: 20 },
  titleRowContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  mainTitle: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -0.5, fontFamily: "Inter, sans-serif" },
  subTitle: { color: "#8b93a7", fontSize: 13, fontWeight: "600", marginTop: 4, fontFamily: "Inter, sans-serif" },

  // Dropdown filter styles
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterDropdownText: { color: "#fff", fontSize: 13, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#12172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    width: 140,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  dropdownItemText: { color: "#fff", fontSize: 12, fontWeight: "600", fontFamily: "Inter, sans-serif" },

  // ── Podium styling ──
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 16,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  podiumSpotContainer: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  crownFloatingIcon: {
    position: "absolute",
    top: -30,
    zIndex: 10,
  },
  podiumPlayerDetails: {
    alignItems: "center",
    marginBottom: 12,
    zIndex: 2,
  },
  podiumAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0d1220",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  podiumAvatarImg: {
    width: "100%",
    height: "100%",
  },
  podiumAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  podiumPlayerName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    fontFamily: "Inter, sans-serif",
    textAlign: "center",
    width: 90,
  },
  podiumPrizePill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  podiumPrizeText: {
    color: "#22d3ee",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  podiumBlock: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 25px rgba(0,0,0,0.2)" } as any : {}),
  },
  podiumNumberText: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
    opacity: 0.15,
  },

  // ── Leaderboard List panel inside Card ──
  leaderboardListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
    paddingBottom: 14,
  },
  leaderboardListTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  timeframeTogglePillContainer: {
    flexDirection: "row",
    backgroundColor: "#0d1220",
    borderRadius: 14,
    padding: 3,
    borderWidth: 0.5,
    borderColor: "#1f2540",
  },
  togglePillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  togglePillBtnActive: {
    backgroundColor: "#00BFFF",
  },
  togglePillBtnText: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  togglePillBtnTextActive: {
    color: "#fff",
  },
  emptyListText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 30,
    fontFamily: "Inter, sans-serif",
  },

  // ── List Row Row Container ──
  rankRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0d1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rankRowContainerMe: {
    borderColor: "#00BFFF",
    backgroundColor: "rgba(124, 58, 237, 0.04)",
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  rankRowAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rankRowAvatarImg: {
    width: "100%",
    height: "100%",
  },
  rankRowAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  rankRowName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  rankRowStats: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  rankRowPnlLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  rankRowPnlVal: {
    color: "#22d3ee",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },

  // ── RIGHT SIDEBAR GIVEAWAY DETAILS ──
  rightSidebar: { width: 320 },
  countdownCard: {
    backgroundColor: "#12172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === 'web' ? { boxShadow: "0 10px 30px rgba(0,0,0,0.15)" } as any : {}),
  },
  countdownHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  countdownHeaderTitle: {
    color: "#22d3ee",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  countdownDigitsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  digitBlock: {
    alignItems: "center",
    minWidth: 44,
  },
  digitText: {
    color: "#22d3ee",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  digitLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 8,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  digitDivider: {
    color: "rgba(34, 211, 238, 0.2)",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    fontFamily: "Inter, sans-serif",
  },

  // Prize Pool Card inside right sidebar
  prizeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  prizeHeaderTitle: {
    color: "#f5b642",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  prizeBigAmount: {
    color: "#f5b642",
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  prizeSubtext: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    fontFamily: "Inter, sans-serif",
  },

  // Avatar list stack
  avatarStackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
    paddingTop: 14,
  },
  avatarStackContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#12172a",
    alignItems: "center",
    justifyContent: "center",
  },
  stackAvatarText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    fontFamily: "Inter, sans-serif",
  },
  joiningCountText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },

  // Mobile layout helpers
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
  },
  mobileBackBtn: { padding: 8 },
  mobileTitleText: { color: "#fff", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" },
});
