import { API_URL } from "../../../config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import DesktopPageShell from "../../../components/game/DesktopPageShell";
import ReferralModal from "../../../components/ReferralModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import CongratulationsModal from "../../../components/CongratulationsModal";
import Avatar from "../../../components/ui/Avatar";
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

  // Active 1s countdown timer for weekly leaderboard reset
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining > 0]);
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
  const mobileScrollRef = useRef<ScrollView>(null);

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
        const resolvedLeaderboard: LeaderboardUser[] =
          Array.isArray(data.leaderboard) && data.leaderboard.length > 0
            ? data.leaderboard
            : [];
        const resolvedTop3 =
          Array.isArray(data.top3) && data.top3.length > 0
            ? data.top3
            : resolvedLeaderboard.slice(0, 3);
        setLeaderboard(resolvedLeaderboard);
        setTop3(resolvedTop3);
        setMyRank(data.myRank || null);
      } else {
        setIsLeaderboardDisabled(false);
        setLeaderboard([]);
        setTop3([]);
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
      setIsLeaderboardDisabled(false);
      setLeaderboard([]);
      setTop3([]);
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

  // Podium Positions Calculation: Real Live Data Only (Zero Mock Fallbacks)
  const podiumData = useMemo(() => {
    // Map Top 3 to Podium Positions: [2nd (Left), 1st (Center), 3rd (Right)]
    const first = top3[0] || null;
    const second = top3[1] || null;
    const third = top3[2] || null;

    return [
      second ? { ...second, rank: 2 } : null,
      first ? { ...first, rank: 1 } : null,
      third ? { ...third, rank: 3 } : null,
    ];
  }, [top3]);

  // Top 1, 2, 3 players for podiums (shared across Desktop and Mobile, hoisted before early returns)
  const top1 = podiumData.find(p => p?.rank === 1) ?? podiumData[1];
  const top2 = podiumData.find(p => p?.rank === 2) ?? podiumData[0];
  const top3User = podiumData.find(p => p?.rank === 3) ?? podiumData[2];

  // First place prize value
  const topPrize = weeklyPrizes.find(p => p.rank === 1)?.amount || 500;
  const cdDays = Math.floor(secondsRemaining / 86400);
  const cdHours = Math.floor((secondsRemaining % 86400) / 3600);
  const cdMins = Math.floor((secondsRemaining % 3600) / 60);
  const cdSecs = secondsRemaining % 60;
  const showPinnedMyRank = Boolean(myRank && !leaderboard.some((item) => item.isMe || String(item.id) === String(myRank.id)));

  if (isLargeScreen) {
    // ─── HIGH FIDELITY DESKTOP WIDESCREEN LAYOUT (Inspired by Image 3) ───
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

        {/* ── UNIFIED DESKTOP SHELL ── */}
        <DesktopPageShell
          currentScreen="leaderboard"
          user={user}
          balance={Number(user?.available_balance || 0)}
          language={language}
          handleLanguageToggle={handleLanguageToggle}
          setPwaModalVisible={setPwaModalVisible}
          setDepositVisible={setDepositVisible}
          setWithdrawVisible={setWithdrawVisible}
          refreshProfile={refreshProfile}
          unreadCount={unreadCount}
          setNotificationsVisible={setNotificationsVisible}
          router={router}
        >
          <ScrollView
            style={s.centerScrollContainer}
            contentContainerStyle={s.lbDesktopScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={s.lbPageWrap}>
              {isLeaderboardDisabled ? (
                <View style={s.lbMaintenanceCard}>
                  <Ionicons name="construct-outline" size={48} color="#f59e0b" style={{ marginBottom: 14 }} />
                  <Text style={{ color: "#fff", fontSize: 19, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
                    Leaderboard under maintenance
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 13.5, textAlign: "center", maxWidth: 420, lineHeight: 21, marginBottom: 20 }}>
                    The leaderboard is temporarily offline for maintenance. Your wins continue to be tracked in real time.
                  </Text>
                  <TouchableOpacity
                    onPress={() => { fetchWeeklyMetadata(); fetchLeaderboardData(); }}
                    style={s.lbRefreshBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh" size={16} color="#07070E" />
                    <Text style={{ color: "#07070E", fontWeight: "800", fontSize: 13.5 }}>Refresh status</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* ── 1. TOP HERO BANNER (Trophy + Weekly Prize Pool + Live Reset Countdown) ── */}
                  <LinearGradient
                    colors={["#141B2D", "#0E1422", "#0D1320"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.lbHeroBanner}
                  >
                    <View style={s.lbHeroLeft}>
                      <View style={s.lbHeroTrophyStage}>
                        <Ionicons name="trophy" size={34} color="#F5B642" />
                      </View>
                      <View style={{ flex: 1, minWidth: 220 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={s.lbHeroTitle}>
                            {timeframe === "alltime"
                              ? (isEN ? "All-time champions" : "የሁሉም ጊዜ አሸናፊዎች")
                              : (isEN ? "Weekly champions" : "ሳምንታዊ አሸናፊዎች")}
                          </Text>
                          <View style={s.lbPlayersPill}>
                            <Text style={s.lbPlayersPillText}>{totalParticipants} players</Text>
                          </View>
                        </View>
                        <Text style={s.lbHeroDesc}>
                          {isEN
                            ? "Compete in XO, Spin & RPS matches to climb the rankings. Top 3 players receive weekly ETB rewards."
                            : "በ XO፣ ስፒን እና RPS በመጫወት ደረጃዎን ያሳድጉ። ከፍተኛ 3 ተጫዋቾች ሳምንታዊ ሽልማት ያገኛሉ።"}
                        </Text>
                      </View>
                    </View>

                    {/* Right: 1st Place Prize + Reset Timer */}
                    <View style={s.lbHeroRight}>
                      <View style={s.lbHeroStatBlock}>
                        <Text style={s.lbHeroStatLabel}>{isEN ? "1st place prize" : "1ኛ ሽልማት"}</Text>
                        <Text style={s.lbHeroPrizeVal}>{Number(topPrize).toLocaleString()} ETB</Text>
                      </View>
                      <View style={s.lbHeroDivider} />
                      <View style={s.lbHeroStatBlock}>
                        <Text style={s.lbHeroStatLabel}>{isEN ? "Resets in" : "ቀሪ ጊዜ"}</Text>
                        <Text style={s.lbHeroTimerVal}>
                          {String(cdDays).padStart(2, "0")}d : {String(cdHours).padStart(2, "0")}h : {String(cdMins).padStart(2, "0")}m : {String(cdSecs).padStart(2, "0")}s
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* ── 2. TOOLBAR ROW: Standings Title + Weekly / All-Time Toggle ── */}
                  <View style={s.lbToolbarRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <Text style={s.lbSectionTitle}>{isEN ? "Standings" : "ደረጃዎች"}</Text>
                      <View style={s.lbSegmentedWrap}>
                        <TouchableOpacity
                          onPress={() => setTimeframe("weekly")}
                          activeOpacity={0.8}
                          style={[s.lbSegmentedBtn, timeframe === "weekly" && s.lbSegmentedBtnActive]}
                        >
                          <Text style={[s.lbSegmentedText, timeframe === "weekly" && s.lbSegmentedTextActive]}>
                            {isEN ? "Weekly" : "ሳምንታዊ"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setTimeframe("alltime")}
                          activeOpacity={0.8}
                          style={[s.lbSegmentedBtn, timeframe === "alltime" && s.lbSegmentedBtnActive]}
                        >
                          <Text style={[s.lbSegmentedText, timeframe === "alltime" && s.lbSegmentedTextActive]}>
                            {isEN ? "All time" : "ሁሉም ጊዜ"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Top 3 Prize Tier Hint */}
                    {weeklyPrizes.length > 0 && (
                      <View style={s.lbPrizesInlineRow}>
                        {weeklyPrizes.slice(0, 3).map((p) => (
                          <View key={p.rank} style={s.lbPrizeChip}>
                            <Text style={s.lbPrizeChipRank}>#{p.rank}</Text>
                            <Text style={s.lbPrizeChipAmt}>{Number(p.amount).toLocaleString()} ETB</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* ── 3. LEADERBOARD TABLE HEADER ── */}
                  <View style={s.lbTableHeader}>
                    <Text style={[s.lbColHeader, { width: 88 }]}>{isEN ? "Position" : "ደረጃ"}</Text>
                    <Text style={[s.lbColHeader, { flex: 1 }]}>{isEN ? "Player" : "ተጫዋች"}</Text>
                    <Text style={[s.lbColHeader, { width: 110, textAlign: "right" }]}>{isEN ? "Matches" : "ጨዋታዎች"}</Text>
                    <Text style={[s.lbColHeader, { width: 110, textAlign: "right" }]}>{isEN ? "Wins" : "ድሎች"}</Text>
                  </View>

                  {/* ── 4. LEADERBOARD ROWS (Top 3 Medal Gradients + Clean List + Pinned You Row) ── */}
                  <View style={{ gap: 8 }}>
                    {loading && (
                      <View style={{ gap: 8 }}>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </View>
                    )}

                    {!loading && leaderboard.length === 0 && (
                      <View style={s.lbEmptyCard}>
                        <Ionicons name="trophy-outline" size={32} color="#475569" />
                        <Text style={s.emptyListText}>No rankings available yet.</Text>
                      </View>
                    )}

                    {!loading && leaderboard.map((item) => {
                      const isTop1 = item.rank === 1;
                      const isTop2 = item.rank === 2;
                      const isTop3 = item.rank === 3;
                      const isMe = item.isMe;
                      const totalGamesCount = item.total || item.wins;
                      const medalColor = isTop1 ? "#F5B642" : isTop2 ? "#CBD5E1" : isTop3 ? "#FB923C" : "#64748B";
                      const gradStart = isTop1
                        ? "rgba(245, 182, 66, 0.16)"
                        : isTop2
                        ? "rgba(148, 163, 184, 0.14)"
                        : isTop3
                        ? "rgba(217, 119, 6, 0.14)"
                        : "#0D1320";

                      return (
                        <LinearGradient
                          key={item.id}
                          colors={isTop1 || isTop2 || isTop3 ? [gradStart, "#0D1320"] : ["#0D1320", "#0D1320"]}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 0.55, y: 0.5 }}
                          style={[
                            s.lbTableRow,
                            isMe && s.lbTableRowMe,
                          ]}
                        >
                          {/* Position / Laurel Rank */}
                          <View style={{ width: 88, flexDirection: "row", alignItems: "center", gap: 6 }}>
                            {isTop1 || isTop2 || isTop3 ? (
                              <View style={[s.lbMedalCircle, { borderColor: `${medalColor}66`, backgroundColor: `${medalColor}1A` }]}>
                                <Ionicons name="ribbon-outline" size={12} color={medalColor} style={{ marginRight: 2 }} />
                                <Text style={[s.lbMedalRankText, { color: medalColor }]}>{item.rank}</Text>
                              </View>
                            ) : (
                              <Text style={s.lbPlainRankText}>{item.rank}</Text>
                            )}
                          </View>

                          {/* Player Avatar + Username */}
                          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <Avatar uri={item.avatar} name={item.username} size={34} />
                            <Text style={[s.lbPlayerName, isMe && { color: "#FFFFFF" }]} numberOfLines={1}>
                              {item.username}
                            </Text>
                            {isMe && (
                              <View style={s.lbYouBadge}>
                                <Text style={s.lbYouBadgeText}>{isEN ? "You" : "እርስዎ"}</Text>
                              </View>
                            )}
                          </View>

                          {/* Matches */}
                          <Text style={s.lbMatchesVal}>{totalGamesCount}</Text>

                          {/* Wins */}
                          <Text style={[s.lbWinsVal, isTop1 && { color: "#F5B642" }]}>
                            {item.wins}
                          </Text>
                        </LinearGradient>
                      );
                    })}

                    {/* Pinned Current User Row when outside visible table (Matching Image 3 bottom bar) */}
                    {!loading && showPinnedMyRank && myRank && (
                      <View style={[s.lbTableRow, s.lbTableRowMe, { marginTop: 6 }]}>
                        <View style={{ width: 88, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.lbPlainRankText, { color: "#00DAF3", fontWeight: "800" }]}>
                            {myRank.rank ? `#${myRank.rank}` : "—"}
                          </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <Avatar uri={myRank.avatar || (user as any)?.avatar} name={user?.username || myRank.username} size={34} />
                          <Text style={[s.lbPlayerName, { color: "#FFFFFF" }]} numberOfLines={1}>
                            {myRank.username && myRank.username !== "You" ? myRank.username : (user?.username || "You")}
                          </Text>
                          <View style={s.lbYouBadge}>
                            <Text style={s.lbYouBadgeText}>{isEN ? "You" : "እርስዎ"}</Text>
                          </View>
                        </View>
                        <Text style={s.lbMatchesVal}>{myRank.total || myRank.wins || 0}</Text>
                        <Text style={[s.lbWinsVal, { color: "#00DAF3" }]}>{myRank.wins || 0}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </DesktopPageShell>
      </View>
    );
  }

  // ─── MOBILE VIEW LAYOUT (Exact Image 3 Wireframe) ───
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  

  return (
    <View style={s.rootContainer}>
      {/* ── Background Image matching Image 2 ── */}
      <Image
        source={require("../../../assets/images/leaderboard-background-top-glow.webp")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(6, 6, 19, 0.55)", "rgba(6, 6, 19, 0.88)", "#060613"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Top Header Row (Back <, Game Title & Live Countdown Timer in Center, Notifications on Right) ── */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 48 : 14,
        paddingBottom: 10,
        backgroundColor: "transparent",
        zIndex: 50,
      }}>
        {/* Left: < Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "rgba(18, 24, 42, 0.8)",
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Center: Title + Live Countdown Timer */}
        <View style={{ alignItems: "center" }}>
          <Text style={{
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "900",
            letterSpacing: 0.5,
          }}>
            {isEN ? "XO LEADERBOARD" : "የመሪዎች ሰሌዳ"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
            <Ionicons name="time-outline" size={13} color="#00DAF3" />
            <Text style={{ color: "#00DAF3", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4 }}>
              {secondsRemaining > 0
                ? `${days}d ${hours}h ${minutes}m ${seconds}s`
                : (isEN ? "7d 0h 0m" : "7ቀ 0ሰ 0ደ")}
            </Text>
            <Text style={{ color: "#8893A7", fontSize: 10.5, fontWeight: "700" }}>
              {isEN ? "ends" : "ቀሪ"}
            </Text>
          </View>
        </View>

        {/* Right: Notifications Button */}
        <TouchableOpacity
          onPress={() => setNotificationsVisible(true)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "rgba(18, 24, 42, 0.8)",
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={18} color="#ffffff" />
          {unreadCount > 0 && (
            <View style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#ef4444",
            }} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── TOP 3 PODIUM (Exact Image 2 Wireframe) ── */}
      <View style={{
        backgroundColor: "transparent",
        paddingTop: 12,
        paddingBottom: 16,
        zIndex: 40,
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 16,
          marginTop: 6,
        }}>
          {/* Rank 2 (Left Silver Circle) */}
          <View style={{ alignItems: "center", width: 96 }}>
            <View style={{ position: "relative", alignItems: "center" }}>
              <View style={{
                width: 74,
                height: 74,
                borderRadius: 37,
                backgroundColor: "#161d31",
                borderWidth: 3,
                borderColor: "#94a3b8",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                <Avatar
                  uri={top2?.avatar}
                  name={top2?.username}
                  size={74}
                />
              </View>
              {/* Badge 2 floating on top-right */}
              <View style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#94a3b8",
                borderWidth: 2,
                borderColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.35,
                shadowRadius: 4,
              }}>
                <Text style={{ color: "#000000", fontSize: 11.5, fontWeight: "900" }}>2</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "800", marginTop: 8 }}>
              {top2?.username || "Open Slot"}
            </Text>
            <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "700", marginTop: 1 }}>
              {top2 ? `${top2.wins ?? 0} wins` : "--"}
            </Text>
            <Text style={{ color: "#cbd5e1", fontSize: 11, fontWeight: "900", marginTop: 2 }}>
              +{weeklyPrizes.find(p => p.rank === 2)?.amount || 3000} ETB
            </Text>
          </View>

          {/* Rank 1 (Center Gold Circle — Tallest & Crowned) */}
          <View style={{ alignItems: "center", width: 116, marginBottom: 8, position: "relative" }}>
            {/* Gold Crown Floating on Top */}
            <Ionicons name="trophy" size={24} color="#f5b642" style={{ marginBottom: 4 }} />
            <View style={{ position: "relative", alignItems: "center" }}>
              <View style={{
                width: 92,
                height: 92,
                borderRadius: 46,
                backgroundColor: "#1e1b18",
                borderWidth: 3.5,
                borderColor: "#f5b642",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                shadowColor: "#f5b642",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 10,
              }}>
                <Avatar
                  uri={top1?.avatar}
                  name={top1?.username}
                  size={92}
                />
              </View>
              {/* Badge 1 floating on top-right */}
              <View style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#f5b642",
                borderWidth: 2,
                borderColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 5,
              }}>
                <Text style={{ color: "#000000", fontSize: 13, fontWeight: "900" }}>1</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 8 }}>
              {top1?.username || "Open Slot"}
            </Text>
            <Text style={{ color: "#8b93a7", fontSize: 11, fontWeight: "700", marginTop: 1 }}>
              {top1 ? `${top1.wins ?? 0} wins` : "--"}
            </Text>
            <Text style={{ color: "#f5b642", fontSize: 12, fontWeight: "900", marginTop: 2 }}>
              +{weeklyPrizes.find(p => p.rank === 1)?.amount || 5000} ETB
            </Text>
          </View>

          {/* Rank 3 (Right Bronze Circle) */}
          <View style={{ alignItems: "center", width: 96 }}>
            <View style={{ position: "relative", alignItems: "center" }}>
              <View style={{
                width: 74,
                height: 74,
                borderRadius: 37,
                backgroundColor: "#1c1815",
                borderWidth: 3,
                borderColor: "#f97316",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}>
                <Avatar
                  uri={top3User?.avatar}
                  name={top3User?.username}
                  size={74}
                />
              </View>
              {/* Badge 3 floating on top-right */}
              <View style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#f97316",
                borderWidth: 2,
                borderColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.35,
                shadowRadius: 4,
              }}>
                <Text style={{ color: "#000000", fontSize: 11.5, fontWeight: "900" }}>3</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "800", marginTop: 8 }}>
              {top3User?.username || "Open Slot"}
            </Text>
            <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "700", marginTop: 1 }}>
              {top3User ? `${top3User.wins ?? 0} wins` : "--"}
            </Text>
            <Text style={{ color: "#f97316", fontSize: 11, fontWeight: "900", marginTop: 2 }}>
              +{weeklyPrizes.find(p => p.rank === 3)?.amount || 1500} ETB
            </Text>
          </View>
        </View>
      </View>

      {/* ── SCROLLABLE SECTION: LATEST WINNINGS + RANKINGS ── */}
      <ScrollView
        ref={mobileScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── RANKED ROWS (Ranks 4+ matching Image 2 sleek pill design) ── */}
        <View style={{ gap: 8, width: "100%", marginTop: 4 }}>
          {leaderboard.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 8 }}>
              <Ionicons name="trophy-outline" size={28} color="rgba(255,255,255,0.2)" />
              <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center", fontStyle: "italic" }}>
                {"No rankings available yet.\nPlay matches to claim rank #1!"}
              </Text>
            </View>
          ) : (
            leaderboard.map((item) => {
              const isMe = item.isMe || item.username === user?.username || item.id === user?.id;
              const rewardAmount = item.rank === 4 ? 500 : item.rank === 5 ? 300 : item.rank <= 10 ? 100 : null;

              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: isMe ? "rgba(0, 218, 243, 0.12)" : "rgba(18, 22, 34, 0.85)",
                    borderRadius: 20,
                    borderWidth: isMe ? 1.5 : 1.2,
                    borderColor: isMe ? "#00DAF3" : "rgba(255, 255, 255, 0.06)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  {/* Left: Rank # + Avatar + Username */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "900", width: 22, textAlign: "center" }}>
                      {item.rank}
                    </Text>

                    <Avatar
                      uri={item.avatar}
                      name={item.username}
                      size={36}
                    />

                    <View>
                      <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800" }}>
                        {item.username} {isMe ? "(You)" : ""}
                      </Text>
                      {rewardAmount ? (
                        <Text style={{ color: "#f59e0b", fontSize: 10.5, fontWeight: "800", marginTop: 1 }}>
                          +{rewardAmount} ETB
                        </Text>
                      ) : (
                        <Text style={{ color: "#64748b", fontSize: 10.5, fontWeight: "600", marginTop: 1 }}>
                          Contender
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Right: Wins Highlight */}
                  <View style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                  }}>
                    <Text style={{ color: "#8b93a7", fontSize: 11.5, fontWeight: "800" }}>
                      {item.wins} wins
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── FLOATING "YOU" BOTTOM PILL — Only displayed when user is ranked > 3 and not visible on the top podium ── */}
      {Boolean(myRank && myRank.rank > 3) && (
        <TouchableOpacity
          onPress={() => {
            const idx = leaderboard.findIndex(p => p.id === myRank?.id || p.username === myRank?.username);
            const scrollY = idx >= 0 ? idx * 64 + 360 : 0;
            mobileScrollRef.current?.scrollTo({ y: scrollY, animated: true });
          }}
          style={{
            position: "absolute",
            bottom: 74,
            alignSelf: "center",
            borderRadius: 24,
            overflow: "hidden",
            shadowColor: "#00DAF3",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
            zIndex: 90,
          }}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={["#00DAF3", "#0091FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 7,
              paddingHorizontal: 14,
              gap: 8,
            }}
          >
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "#ffffff",
            }}>
              <Avatar
                uri={myRank?.avatar || user?.avatar}
                name={myRank?.username || user?.username}
                size={28}
              />
            </View>
            <View>
              <Text style={{ color: "#060613", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>
                YOU
              </Text>
              <Text style={{ color: "#060613", fontSize: 10, fontWeight: "800" }}>
                #{myRank?.rank || "--"}
              </Text>
            </View>
            <Ionicons name="arrow-down" size={16} color="#060613" style={{ marginLeft: 2 }} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Fixed Bottom Navigation Bar (Image 3: Home, History, Rank [Active Pill], Wallet, Profile) ── */}
      <View style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: "#070c18",
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.08)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 12,
        paddingBottom: Platform.OS === "ios" ? 12 : 0,
        zIndex: 100,
      }}>
        {/* 1. Home */}
        <TouchableOpacity
          onPress={() => router.replace("/(authed)/home")}
          style={{ alignItems: "center", justifyContent: "center", padding: 8 }}
        >
          <Ionicons name="home-outline" size={22} color="#64748b" />
        </TouchableOpacity>

        {/* 2. History */}
        <TouchableOpacity
          onPress={() => router.replace("/(authed)/home/history")}
          style={{ alignItems: "center", justifyContent: "center", padding: 8 }}
        >
          <Ionicons name="time-outline" size={22} color="#64748b" />
        </TouchableOpacity>

        {/* 3. Rank (Active Glowing Pill matching Image 3) */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(0, 191, 255, 0.18)",
            borderWidth: 1.5,
            borderColor: "#00BFFF",
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 20,
            shadowColor: "#00BFFF",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="trophy" size={17} color="#00BFFF" />
          <Text style={{ color: "#00BFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 }}>Rank</Text>
        </TouchableOpacity>

        {/* 4. Wallet / Transactions */}
        <TouchableOpacity
          onPress={() => router.replace("/(authed)/home/transactions")}
          style={{ alignItems: "center", justifyContent: "center", padding: 8 }}
        >
          <Ionicons name="wallet-outline" size={22} color="#64748b" />
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity
          onPress={() => router.replace("/(authed)/home/account")}
          style={{ alignItems: "center", justifyContent: "center", padding: 8 }}
        >
          <Ionicons name="person-outline" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

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
    height: "100%",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: "row",
    gap: 20,
    alignItems: "stretch",
    overflow: "hidden",
  },
  stickySidebarScrollLeft: {
    width: 260,
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  stickySidebarScrollRight: {
    width: 320,
    maxWidth: "35%",
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
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 18,
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
  centerColumn: { flex: 1, minWidth: 0, gap: 16 },
  titleRowContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  mainTitle: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, fontFamily: "Inter, sans-serif", flexShrink: 1, minWidth: 0 },
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
    borderColor: "#00DAF3",
    backgroundColor: "rgba(0, 218, 243, 0.08)",
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

  // ── Desktop Image 3 Inspired Leaderboard Layout ──
  lbDesktopScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 48,
  },
  lbPageWrap: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    gap: 18,
  },
  lbMaintenanceCard: {
    backgroundColor: "#0D1320",
    borderRadius: 18,
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  lbRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00DAF3",
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
  },
  lbHeroBanner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 18,
  },
  lbHeroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    flex: 1,
    minWidth: 280,
  },
  lbHeroTrophyStage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "rgba(245, 182, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  lbHeroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  lbPlayersPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  lbPlayersPillText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  lbHeroDesc: {
    color: "#8B8FA8",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 500,
  },
  lbHeroRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "rgba(7, 7, 14, 0.55)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  lbHeroStatBlock: {
    alignItems: "flex-start",
  },
  lbHeroStatLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  lbHeroPrizeVal: {
    color: "#F5B642",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  lbHeroTimerVal: {
    color: "#00DAF3",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  lbHeroDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  lbToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  lbSectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  lbSegmentedWrap: {
    flexDirection: "row",
    backgroundColor: "#0D1320",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 4,
  },
  lbSegmentedBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  lbSegmentedBtnActive: {
    backgroundColor: "#00DAF3",
  },
  lbSegmentedText: {
    color: "#94A3B8",
    fontSize: 12.5,
    fontWeight: "700",
  },
  lbSegmentedTextActive: {
    color: "#07070E",
    fontWeight: "800",
  },
  lbPrizesInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lbPrizeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#0D1320",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  lbPrizeChipRank: {
    color: "#8B8FA8",
    fontSize: 11,
    fontWeight: "700",
  },
  lbPrizeChipAmt: {
    color: "#F5B642",
    fontSize: 11.5,
    fontWeight: "800",
  },
  lbTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  lbColHeader: {
    color: "#64748B",
    fontSize: 11.5,
    fontWeight: "600",
  },
  lbEmptyCard: {
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  lbTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#0D1320",
  },
  lbTableRowMe: {
    borderColor: "#00DAF3",
    backgroundColor: "rgba(0, 218, 243, 0.08)",
  },
  lbMedalCircle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  lbMedalRankText: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  lbPlainRankText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    paddingLeft: 10,
  },
  lbPlayerName: {
    color: "#E2E8F0",
    fontSize: 13.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  lbYouBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0, 218, 243, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.35)",
  },
  lbYouBadgeText: {
    color: "#00DAF3",
    fontSize: 10.5,
    fontWeight: "800",
  },
  lbMatchesVal: {
    width: 110,
    textAlign: "right",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  lbWinsVal: {
    width: 110,
    textAlign: "right",
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },

  // ── RIGHT SIDEBAR GIVEAWAY DETAILS ──
  rightSidebar: { width: 320 },
  countdownCard: {
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
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
