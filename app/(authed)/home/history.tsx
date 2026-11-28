import { API_URL } from "../../../config";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Pressable,
  View,
  useWindowDimensions,
  Image,
  ScrollView,
} from "react-native";
import { useAuth } from "../../../context/authContext";
import ScreenWrapper from "../../../components/ScreenWrapper";
import { WebPressable } from "../../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import ProfileEditModal from "../../../components/ProfileEditModal";
import DesktopHeader from "../../../components/game/DesktopHeader";
import DesktopSidebar from "../../../components/game/DesktopSidebar";
import DesktopPageShell from "../../../components/game/DesktopPageShell";
import ReferralModal from "../../../components/ReferralModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { SkeletonRow } from "../../../components/SkeletonLoading";
import SpinWheel from "../../../components/game/SpinWheel";
import { HistoryDetailPanel } from "../../../components/history/HistoryDetailPanel";

// ---- Types ----
type Move = { ts: string; user: string; index: number; symbol: "X" | "O" };
type Game = {
  id: string;
  created_at: string;
  finished_at: string | null;
  bet_amount: number;
  players: string[];
  moves: Move[];
  winner?: string;
  result?: 'win' | 'loss' | 'abandoned';
  is_winner?: boolean;
  is_abandoned?: boolean;
  px_name?: string;
  po_name?: string;
  px_num?: string;
  po_num?: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  try {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString();
  }
}

const getDuration = (start: string, end: string | null) => {
  if (!end) return "00:30";
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const min = String(Math.floor(diffSec / 60)).padStart(2, '0');
  const sec = String(diffSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
};

const getBoardFromMoves = (moves: Move[]) => {
  const board = Array(9).fill(null);
  if (!moves || !Array.isArray(moves)) return board;
  moves.forEach(move => {
    if (move && typeof move.index === 'number' && move.index >= 0 && move.index < 9) {
      board[move.index] = move.symbol;
    }
  });
  return board;
};

const getBoardForStep = (moves: Move[], step: number) => {
  const board = Array(9).fill(null);
  if (!moves || !Array.isArray(moves) || step <= 0) return board;

  // Determine current round offset (round 1 = moves 1..9, round 2 = moves 10..18, etc.)
  // Resets board clean for each round so symbols don't overlay
  const currentRoundIndex = Math.floor((step - 1) / 9);
  const roundStartMove = currentRoundIndex * 9;
  const visibleMoves = moves.slice(roundStartMove, step);

  visibleMoves.forEach(move => {
    if (move && typeof move.index === 'number' && move.index >= 0 && move.index < 9) {
      board[move.index] = move.symbol;
    }
  });
  return board;
};

export default function GamesHistory() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;

  const { user, token, language, refreshProfile, switchLanguage } = useAuth();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const myId = user?.id ?? null;
  const isEN = language === "en";

  const handleLanguageToggle = useCallback(() => {
    switchLanguage?.();
  }, [switchLanguage]);

  const [currentMoveStep, setCurrentMoveStep] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  // Unified History State — XO, Spin, and RPS
  const [activeGameFilter, setActiveGameFilter] = useState<"all" | "xo" | "spin" | "rps">("all");
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [spinLoading, setSpinLoading] = useState(false);
  const [rpsHistory, setRpsHistory] = useState<any[]>([]);
  const [rpsLoading, setRpsLoading] = useState(false);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [selectedRpsId, setSelectedRpsId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"xo" | "spin" | "rps">("xo");

  const [isSpinReplayPlaying, setIsSpinReplayPlaying] = useState(false);
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 8;

  // Web outside-click listener for reliable filter dropdown dismissal
  useEffect(() => {
    if (!dropdownOpen || Platform.OS !== 'web') return;
    const handleOutsideClick = () => {
      setDropdownOpen(false);
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Modals visibility
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/account/history`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load history");
      const fetchedGames = Array.isArray(data?.history) ? data.history : [];
      setGames(fetchedGames);
    } catch (e: any) {
      setError(e?.message || "Could not fetch history");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchSpinHistory = useCallback(async () => {
    if (!token) return;
    try {
      setSpinLoading(true);
      const res = await fetch(`${API_URL}/spin/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSpinHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (e) {
      console.error('[SPIN_HISTORY_ERR]', e);
    } finally {
      setSpinLoading(false);
    }
  }, [token]);

  const fetchRpsHistory = useCallback(async () => {
    if (!token) return;
    try {
      setRpsLoading(true);
      const res = await fetch(`${API_URL}/rps/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRpsHistory(Array.isArray(data.matches) ? data.matches : []);
      }
    } catch (e) {
      console.error('[RPS_HISTORY_ERR]', e);
    } finally {
      setRpsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
    fetchSpinHistory();
    fetchRpsHistory();
  }, [fetchHistory, fetchSpinHistory, fetchRpsHistory]);

  // Unified Chronological History List merging XO, Spin, and RPS
  const unifiedHistory = useMemo(() => {
    const list: Array<{
      id: string;
      gameType: "xo" | "spin" | "rps";
      timestamp: number;
      created_at: string;
      isWin: boolean;
      statusLabel: string;
      statusColor: string;
      gameBadge: string;
      gameBadgeColor: string;
      title: string;
      subtitle: string;
      stakeAmount: number;
      prizeAmount: number;
      netDelta: number;
      potAmount?: number;
      originalData: any;
    }> = [];

    // 1. XO Games
    games.forEach((g) => {
      const isWin =
        g.is_winner === true ||
        (g.is_winner === undefined &&
          g.winner != null &&
          String(g.winner).toLowerCase() === String(myId || "").toLowerCase());
      const opponentName = isWin ? g.po_name || "Opponent" : g.px_name || "Opponent";
      const stake = Number(g.bet_amount || 0);
      const prize = isWin ? Math.round(stake * 1.6) : 0;
      const net = isWin ? prize - stake : -stake;

      list.push({
        id: `xo_${g.id}`,
        gameType: "xo",
        timestamp: new Date(g.created_at).getTime() || 0,
        created_at: g.created_at,
        isWin,
        statusLabel: isWin ? "VICTORY" : "DEFEAT",
        statusColor: isWin ? "#22c55e" : "#ef4444",
        gameBadge: "XO BATTLE",
        gameBadgeColor: "#00BFFF",
        title: "XO Battle 1v1",
        subtitle: `vs @${opponentName}`,
        stakeAmount: stake,
        prizeAmount: prize,
        netDelta: net,
        potAmount: stake * 2,
        originalData: g,
      });
    });

    // 2. Spin Rounds
    spinHistory.forEach((s) => {
      const isWin = Boolean(
        s.is_winner || (s.winner_user_id && String(s.winner_user_id).toLowerCase() === String(myId || "").toLowerCase())
      );
      const stake = Number(s.bet_amount || s.user_bet || 100);
      const prize = Number(s.prize_amount || 0);
      const net = isWin ? prize - stake : -stake;
      const modeLabel = s.mode_label || (s.config_id === 2 ? "Rail Spin" : "5-Player Spin");

      list.push({
        id: `spin_${s.round_id || s.id || Math.random()}`,
        gameType: "spin",
        timestamp: new Date(s.created_at).getTime() || 0,
        created_at: s.created_at,
        isWin,
        statusLabel: isWin ? "VICTORY" : "PLAYED",
        statusColor: isWin ? "#22c55e" : "#8b93a7",
        gameBadge: "SPIN & WIN",
        gameBadgeColor: "#FF3B57",
        title: modeLabel,
        subtitle: isWin ? "You took the pot!" : `Winner: @${s.winner_name || "—"}`,
        stakeAmount: stake,
        prizeAmount: prize,
        netDelta: net,
        potAmount: Number(s.pot_amount || s.prize_amount || stake * 5),
        originalData: s,
      });
    });

    // 3. RPS Matches
    rpsHistory.forEach((r) => {
      const isWin = String(r.winner_id || "").toLowerCase() === String(myId || "").toLowerCase();
      const isP1 = String(r.player_1 || "").toLowerCase() === String(myId || "").toLowerCase();
      const oppName = isP1 ? r.p2_username || "Opponent" : r.p1_username || "Opponent";
      const myScore = isP1 ? Number(r.score_p1 || 0) : Number(r.score_p2 || 0);
      const oppScore = isP1 ? Number(r.score_p2 || 0) : Number(r.score_p1 || 0);
      const stake = Number(r.stake_amount || 0);
      const prize = Number(r.prize_amount || 0);
      const net = isWin ? prize - stake : -stake;

      list.push({
        id: `rps_${r.id}`,
        gameType: "rps",
        timestamp: new Date(r.created_at).getTime() || 0,
        created_at: r.created_at,
        isWin,
        statusLabel: isWin ? "VICTORY" : "DEFEAT",
        statusColor: isWin ? "#22c55e" : "#ef4444",
        gameBadge: "RPS BATTLE",
        gameBadgeColor: "#A855F7",
        title: "Rock Paper Scissors",
        subtitle: `vs @${oppName} (${myScore}-${oppScore})`,
        stakeAmount: stake,
        prizeAmount: prize,
        netDelta: net,
        potAmount: Number(r.pot_amount || stake * 2),
        originalData: r,
      });
    });

    // Strict chronological descending sort
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [games, spinHistory, rpsHistory, myId]);

  // Combined Summary Metrics across all 3 games
  const combinedSummary = useMemo(() => {
    const total = unifiedHistory.length;
    const wins = unifiedHistory.filter((x) => x.isWin).length;
    const losses = unifiedHistory.filter((x) => !x.isWin && x.gameType !== "spin").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const totalWinnings = unifiedHistory.reduce((acc, x) => acc + (x.isWin ? x.prizeAmount : 0), 0);
    return {
      total,
      wins,
      losses,
      winRate,
      totalWinnings,
    };
  }, [unifiedHistory]);

  // Filtered Items (Category & Outcome)
  const filteredHistory = useMemo(() => {
    return unifiedHistory.filter((item) => {
      if (activeGameFilter !== "all" && item.gameType !== activeGameFilter) return false;
      if (filter === "win" && !item.isWin) return false;
      if (filter === "loss" && item.isWin) return false;
      return true;
    });
  }, [unifiedHistory, activeGameFilter, filter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * gamesPerPage;
    return filteredHistory.slice(startIndex, startIndex + gamesPerPage);
  }, [filteredHistory, currentPage, gamesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / gamesPerPage));

  // Determine currently selected game object for replay / details (ONLY when user clicks a row)
  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    return games.find((g) => g.id === selectedGameId) || null;
  }, [selectedGameId, games]);

  const selectedSpin = useMemo(() => {
    if (!selectedSpinId) return null;
    return spinHistory.find((s) => String(s.round_id || s.id || "") === selectedSpinId) || null;
  }, [selectedSpinId, spinHistory]);

  const selectedRps = useMemo(() => {
    if (!selectedRpsId) return null;
    return rpsHistory.find((r) => String(r.id) === selectedRpsId) || null;
  }, [selectedRpsId, rpsHistory]);

  const isDetailOpen = Boolean(
    (selectedType === "xo" && selectedGame) ||
    (selectedType === "spin" && selectedSpin) ||
    (selectedType === "rps" && selectedRps)
  );
  const drawerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: isDetailOpen ? 1 : 0,
      duration: isDetailOpen ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [isDetailOpen, drawerAnim]);

  const closeDetails = useCallback(() => {
    setSelectedGameId(null);
    setSelectedSpinId(null);
    setSelectedRpsId(null);
    setIsPlayingReplay(false);
    setIsSpinReplayPlaying(false);
  }, []);

  // Reset replay controls state when selectedGame changes
  useEffect(() => {
    if (selectedGame) {
      setCurrentMoveStep(selectedGame.moves ? selectedGame.moves.length : 0);
      setIsPlayingReplay(false);
    }
  }, [selectedGameId, selectedGame]);

  // Replay interval timer
  useEffect(() => {
    let interval: any;
    if (isPlayingReplay && selectedGame) {
      interval = setInterval(() => {
        setCurrentMoveStep((prev) => {
          if (prev >= selectedGame.moves.length) {
            setIsPlayingReplay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlayingReplay, selectedGame]);

  const handleSelectItem = (item: any) => {
    if (item.gameType === "xo") {
      setSelectedGameId(item.originalData.id);
      setSelectedSpinId(null);
      setSelectedRpsId(null);
      setSelectedType("xo");
    } else if (item.gameType === "spin") {
      setSelectedSpinId(String(item.originalData.round_id || item.originalData.id || ""));
      setSelectedGameId(null);
      setSelectedRpsId(null);
      setSelectedType("spin");
      setIsSpinReplayPlaying(false);
    } else if (item.gameType === "rps") {
      setSelectedRpsId(String(item.originalData.id));
      setSelectedGameId(null);
      setSelectedSpinId(null);
      setSelectedType("rps");
    }
  };

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
        <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

        {/* ── UNIFIED DESKTOP SHELL ── */}
        <DesktopPageShell
          currentScreen="history"
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
          {/* ── CORE BODY CONTAINER (Center-only scrolling, Sticky Details Panel) ── */}
          <View style={s.desktopLayoutContainer}>
            {/* 1. CENTER COLUMN */}
            <ScrollView
              style={s.centerScrollContainer}
              contentContainerStyle={s.centerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={s.centerColumn}>
                {/* Header & Controls Row */}
                <View style={s.titleRowContainer}>
                  <View>
                    <Text style={s.mainTitle}>Game history</Text>
                    <Text style={s.subTitle}>
                      Completed matches across XO, Spin & Win, and RPS
                    </Text>
                  </View>

                  {/* Outcome Filter Dropdown */}
                  <View style={{ position: "relative", zIndex: 1000 }}>
                    <TouchableOpacity onPress={() => setDropdownOpen(!dropdownOpen)} style={s.filterDropdown} activeOpacity={0.85}>
                      <Ionicons name="options-outline" size={14} color="#94A3B8" />
                      <Text style={s.filterDropdownText}>
                        {filter === "all" ? "All results" : (filter === "win" ? "Victory" : "Defeat")}
                      </Text>
                      <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
                    </TouchableOpacity>
                    {dropdownOpen && (
                      <>
                        <Pressable
                          onPress={() => setDropdownOpen(false)}
                          style={{
                            position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                          }}
                        />
                        <View style={s.dropdownMenu}>
                          <TouchableOpacity
                            onPress={() => { setFilter("all"); setDropdownOpen(false); setCurrentPage(1); }}
                            style={[s.dropdownItem, filter === "all" && s.dropdownItemActive]}
                          >
                            <Text style={[s.dropdownItemText, filter === "all" && s.dropdownItemTextActive]}>All results</Text>
                            {filter === "all" && <Ionicons name="checkmark" size={14} color="#00DAF3" />}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => { setFilter("win"); setDropdownOpen(false); setCurrentPage(1); }}
                            style={[s.dropdownItem, filter === "win" && s.dropdownItemActive]}
                          >
                            <Text style={[s.dropdownItemText, filter === "win" && s.dropdownItemTextActive]}>Victory</Text>
                            {filter === "win" && <Ionicons name="checkmark" size={14} color="#34D399" />}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => { setFilter("loss"); setDropdownOpen(false); setCurrentPage(1); }}
                            style={[s.dropdownItem, filter === "loss" && s.dropdownItemActive]}
                          >
                            <Text style={[s.dropdownItemText, filter === "loss" && s.dropdownItemTextActive]}>Defeat</Text>
                            {filter === "loss" && <Ionicons name="checkmark" size={14} color="#F87171" />}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Segmented Game Category Filter Bar */}
                <View style={s.segmentedBar}>
                  {(
                    [
                      { id: 'all', label: 'All games', count: unifiedHistory.length, icon: 'layers-outline' },
                      { id: 'xo', label: 'XO battles', count: games.length, icon: 'grid-outline' },
                      { id: 'spin', label: 'Spin wheel', count: spinHistory.length, icon: 'disc-outline' },
                      { id: 'rps', label: 'RPS battle', count: rpsHistory.length, icon: 'hand-right-outline' },
                    ] as const
                  ).map((cat) => {
                    const isActive = activeGameFilter === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setActiveGameFilter(cat.id);
                          setCurrentPage(1);
                        }}
                        activeOpacity={0.8}
                        style={[s.segmentedPill, isActive && s.segmentedPillActive]}
                      >
                        <Ionicons name={cat.icon as any} size={14} color={isActive ? '#00DAF3' : '#64748B'} />
                        <Text style={[s.segmentedText, isActive && s.segmentedTextActive]}>
                          {cat.label}
                        </Text>
                        <View style={[s.segmentedCount, isActive && s.segmentedCountActive]}>
                          <Text style={[s.segmentedCountText, isActive && s.segmentedCountTextActive]}>
                            {cat.count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Combined Stats Row (Clean Monochrome + Gold Winnings) */}
                <View style={s.statsGrid}>
                  <View style={s.statCard}>
                    <View style={s.statIconCircle}>
                      <Ionicons name="layers-outline" size={17} color="#94A3B8" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>Total games</Text>
                      <Text style={s.statCardVal}>{combinedSummary.total}</Text>
                    </View>
                  </View>
                  <View style={s.statCard}>
                    <View style={s.statIconCircle}>
                      <Ionicons name="trending-up-outline" size={17} color="#94A3B8" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>Win rate</Text>
                      <Text style={s.statCardVal}>{combinedSummary.winRate}%</Text>
                    </View>
                  </View>
                  <View style={s.statCard}>
                    <View style={s.statIconCircle}>
                      <Ionicons name="checkmark-circle-outline" size={17} color="#94A3B8" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>Total wins</Text>
                      <Text style={[s.statCardVal, { color: "#34D399" }]}>{combinedSummary.wins}</Text>
                    </View>
                  </View>
                  <View style={s.statCard}>
                    <View style={s.statIconCircle}>
                      <Ionicons name="trophy-outline" size={17} color="#94A3B8" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>Total winnings</Text>
                      <Text style={[s.statCardVal, { color: "#F5B642", fontSize: 17 }]}>
                        {combinedSummary.totalWinnings.toLocaleString()} ETB
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Match Rows List — Unified Clean Container */}
                <View style={s.historyListCard}>
                  {loading && (
                    <View style={{ gap: 8, padding: 8 }}>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </View>
                  )}

                  {!loading && paginatedItems.length === 0 && (
                    <View style={s.emptyState}>
                      <Ionicons name="game-controller-outline" size={34} color="rgba(255,255,255,0.16)" style={{ marginBottom: 10 }} />
                      <Text style={s.emptyStateText}>
                        {isEN ? "No matches recorded yet for this selection." : "ምንም የተመዘገበ የጨዋታ ታሪክ የለም።"}
                      </Text>
                    </View>
                  )}

                  {paginatedItems.map((item, idx) => {
                    const isSelected =
                      (item.gameType === "xo" && selectedGameId === item.originalData.id) ||
                      (item.gameType === "spin" && selectedSpinId === String(item.originalData.round_id || item.originalData.id || "")) ||
                      (item.gameType === "rps" && selectedRpsId === String(item.originalData.id));
                    const isLast = idx === paginatedItems.length - 1;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleSelectItem(item)}
                        activeOpacity={0.85}
                        style={[
                          s.matchCardRow,
                          !isLast && s.matchCardRowDivider,
                          isSelected && s.matchCardRowSelected,
                        ]}
                      >
                        {/* Left: Game Icon + Title & Opponent */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0, overflow: "hidden" }}>
                          <View style={[
                            s.matchGameIconBox,
                            isSelected && { borderColor: "rgba(0, 218, 243, 0.4)", backgroundColor: "rgba(0, 218, 243, 0.1)" }
                          ]}>
                            <Ionicons
                              name={
                                item.gameType === "xo"
                                  ? "grid-outline"
                                  : item.gameType === "spin"
                                  ? "disc-outline"
                                  : "hand-right-outline"
                              }
                              size={16}
                              color={isSelected ? "#00DAF3" : "#94A3B8"}
                            />
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <View style={[s.subtleGameTag, { flexShrink: 0 }]}>
                                <Text style={s.subtleGameTagText}>
                                  {item.gameType === "xo" ? "XO" : item.gameType === "spin" ? "Spin" : "RPS"}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ color: "#8B8FA8", fontSize: 12, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          </View>
                        </View>

                        {/* Middle: Outcome Pill (Restrained Semantic) */}
                        <View style={{ minWidth: 74, flexShrink: 0, alignItems: "flex-start" }}>
                          <View
                            style={[
                              s.outcomePillChip,
                              {
                                backgroundColor: item.isWin ? "rgba(52, 211, 153, 0.1)" : item.gameType === "spin" ? "rgba(148, 163, 184, 0.1)" : "rgba(248, 113, 113, 0.1)",
                                borderColor: item.isWin ? "rgba(52, 211, 153, 0.25)" : item.gameType === "spin" ? "rgba(148, 163, 184, 0.2)" : "rgba(248, 113, 113, 0.25)",
                              },
                            ]}
                          >
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: item.isWin ? "#34D399" : item.gameType === "spin" ? "#94A3B8" : "#F87171",
                              }}
                            />
                            <Text
                              style={{
                                color: item.isWin ? "#34D399" : item.gameType === "spin" ? "#94A3B8" : "#F87171",
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                              numberOfLines={1}
                            >
                              {item.isWin ? "Won" : item.gameType === "spin" ? "Played" : "Lost"}
                            </Text>
                          </View>
                        </View>

                        {/* Right: Amounts + Date + Chevron */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <View style={{ alignItems: "flex-end", minWidth: 78 }}>
                            <Text
                              style={{
                                color: item.isWin ? "#34D399" : "#CBD5E1",
                                fontWeight: "800",
                                fontSize: 13.5,
                              }}
                              numberOfLines={1}
                            >
                              {item.isWin ? `+${item.prizeAmount.toLocaleString()} ETB` : `${item.stakeAmount.toLocaleString()} ETB`}
                            </Text>
                            <Text style={{ color: "#64748B", fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                              Stake {item.stakeAmount.toLocaleString()} ETB
                            </Text>
                          </View>
                          {width >= 1180 && (
                            <Text style={[s.dateText, { minWidth: 92, textAlign: "right" }]} numberOfLines={1}>
                              {formatWhen(item.created_at)}
                            </Text>
                          )}
                          <Ionicons
                            name="chevron-forward"
                            size={15}
                            color={isSelected ? "#00DAF3" : "#64748B"}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <View style={s.paginationRow}>
                    <TouchableOpacity
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage(currentPage - 1)}
                      style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
                    >
                      <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#1f2540" : "#8b93a7"} />
                    </TouchableOpacity>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <TouchableOpacity
                          key={pageNum}
                          onPress={() => setCurrentPage(pageNum)}
                          style={[s.pageNumberBtn, isActive && s.pageNumberBtnActive]}
                        >
                          <Text style={[s.pageNumberText, isActive && s.pageNumberTextActive]}>
                            {pageNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      disabled={currentPage === totalPages}
                      onPress={() => setCurrentPage(currentPage + 1)}
                      style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
                    >
                      <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#1f2540" : "#8b93a7"} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* 2. SLIDE-IN MATCH / ROUND DETAILS DRAWER (Only renders when a row is clicked; does NOT reserve empty width) */}
            {isDetailOpen && (
              <View style={s.drawerBackdropLayer}>
                <Pressable style={s.drawerScrim} onPress={closeDetails} />
                <Animated.View
                  style={[
                    s.drawerPanel,
                    {
                      opacity: drawerAnim,
                      transform: [
                        {
                          translateX: drawerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [380, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <HistoryDetailPanel
                      selectedRound={selectedType === "spin" ? selectedSpin : null}
                      selectedGame={selectedType === "xo" ? selectedGame : null}
                      selectedRps={selectedType === "rps" ? selectedRps : null}
                      myId={myId}
                      user={user}
                      onCloseSpin={closeDetails}
                      onCloseGame={closeDetails}
                      onCloseRps={closeDetails}
                      isSpinReplayPlaying={isSpinReplayPlaying}
                      setIsSpinReplayPlaying={setIsSpinReplayPlaying}
                      currentMoveStep={currentMoveStep}
                      setCurrentMoveStep={setCurrentMoveStep}
                      isPlayingReplay={isPlayingReplay}
                      setIsPlayingReplay={setIsPlayingReplay}
                    />
                  </ScrollView>
                </Animated.View>
              </View>
            )}
          </View>
        </DesktopPageShell>
      </View>
    );
  }

  // ─── MOBILE VIEW LAYOUT ───
  return (
    <ScreenWrapper>
      <View style={s.rootContainer}>
        <LinearGradient colors={["#0c0c1f", "#070714"]} style={StyleSheet.absoluteFill} />

        {/* Mobile Header */}
        <View style={s.mobileHeader}>
          <TouchableOpacity
            onPress={() => {
              if (isDetailOpen) {
                closeDetails();
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(authed)/home/gameplay" as any);
              }
            }}
            style={s.mobileBackBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#00daf3" />
          </TouchableOpacity>
          <Text style={s.mobileTitleText}>Game History</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Mobile Game Filter Pills: All Games (Default), XO, Spin, RPS */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: 12, gap: 8 }}>
          {(
            [
              { id: "all", label: "All" },
              { id: "xo", label: "XO Battles" },
              { id: "spin", label: "Spin Wheel" },
              { id: "rps", label: "RPS" },
            ] as const
          ).map((cat) => {
            const isActive = activeGameFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveGameFilter(cat.id)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: isActive ? "#00BFFF" : "rgba(255,255,255,0.04)",
                  borderWidth: 1,
                  borderColor: isActive ? "#00BFFF" : "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: isActive ? "#fff" : "#8b93a7", fontSize: 11.5, fontWeight: "800" }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Combined Mobile Stat Cards */}
        <View style={{ paddingHorizontal: 16, marginTop: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>TOTAL GAMES</Text>
              <Text style={s.mobileStatVal}>{combinedSummary.total}</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>WIN RATE</Text>
              <Text style={s.mobileStatVal}>{combinedSummary.winRate}%</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>TOTAL WINS</Text>
              <Text style={[s.mobileStatVal, { color: "#22c55e" }]}>{combinedSummary.wins}</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>WINNINGS</Text>
              <Text style={[s.mobileStatVal, { color: "#f5b642", fontSize: 15 }]}>
                {combinedSummary.totalWinnings.toLocaleString()} ETB
              </Text>
            </View>
          </View>
        </View>

        {/* Mobile Filter Bar (All, Victory, Defeat) */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>FILTER BY</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilter("all")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filter === "all" ? "#00BFFF" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "all" ? "rgba(0, 191, 255, 0.2)" : "rgba(255,255,255,0.05)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "all" ? "#fff" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter("win")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filter === "win" ? "#22c55e" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "win" ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "win" ? "#22c55e" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>Victory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter("loss")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filter === "loss" ? "#ef4444" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "loss" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "loss" ? "#ef4444" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>Defeat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile Unified Match Stream (All Games at once in chronological order) */}
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 }}>
              <Ionicons name="game-controller-outline" size={44} color="#64748b" />
              <Text style={{ color: "#94a3b8", fontSize: 14, fontWeight: "600" }}>
                No match history recorded yet
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (item.gameType === "xo") {
                    router.push({
                      pathname: "/(authed)/games/[id]",
                      params: {
                        id: item.originalData.id,
                        bet: String(item.originalData.bet_amount),
                        created_at: item.originalData.created_at,
                        moves: encodeURIComponent(JSON.stringify(item.originalData.moves || [])),
                        p1: Array.isArray(item.originalData.players) ? item.originalData.players[0] : String(item.originalData.players),
                        p2: Array.isArray(item.originalData.players) ? item.originalData.players[1] : "",
                        px_name: item.originalData.px_name || item.originalData.px_num || "",
                        po_name: item.originalData.po_name || item.originalData.po_num || "",
                      },
                    } as any);
                  } else if (item.gameType === "spin" || item.gameType === "rps") {
                    handleSelectItem(item);
                  }
                }}
                style={s.mobileMatchRowCard}
              >
                {/* Outcome Pill */}
                <View style={[s.mobileOutcomePill, { borderColor: `${item.statusColor}40`, backgroundColor: `${item.statusColor}15` }]}>
                  <Ionicons name={item.isWin ? "trophy" : item.gameType === "spin" ? "disc" : "skull"} size={12} color={item.statusColor} />
                  <Text style={[s.mobileOutcomeText, { color: item.statusColor }]}>{item.statusLabel}</Text>
                </View>

                {/* Details */}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        color: item.gameBadgeColor,
                        fontSize: 10,
                        fontWeight: "900",
                        backgroundColor: `${item.gameBadgeColor}20`,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      {item.gameBadge}
                    </Text>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 }}>
                    {formatWhen(item.created_at)}
                  </Text>
                </View>

                {/* Amount & Arrow */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: item.isWin ? "#22c55e" : "#f5b642", fontWeight: "900", fontSize: 13 }}>
                    {item.isWin ? `+${item.prizeAmount} ETB` : `ETB ${item.stakeAmount}`}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Mobile Match Detail Modal (Spin & RPS) */}
        <Modal
          visible={Boolean(isDetailOpen && !isLargeScreen)}
          animationType="slide"
          transparent={false}
          onRequestClose={closeDetails}
        >
          <View style={{ flex: 1, backgroundColor: "#070714" }}>
            <View style={s.mobileHeader}>
              <TouchableOpacity
                onPress={closeDetails}
                style={s.mobileBackBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#00daf3" />
              </TouchableOpacity>
              <Text style={s.mobileTitleText}>
                {selectedType === "rps" ? "RPS Match Detail" : selectedType === "spin" ? "Spin Round Detail" : "Match Detail"}
              </Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <HistoryDetailPanel
                selectedRound={selectedType === "spin" ? selectedSpin : null}
                selectedGame={selectedType === "xo" ? selectedGame : null}
                selectedRps={selectedType === "rps" ? selectedRps : null}
                myId={myId}
                user={user}
                onCloseSpin={() => setSelectedSpinId(null)}
                onCloseGame={() => setSelectedGameId(null)}
                onCloseRps={() => setSelectedRpsId(null)}
                isSpinReplayPlaying={isSpinReplayPlaying}
                setIsSpinReplayPlaying={setIsSpinReplayPlaying}
                currentMoveStep={currentMoveStep}
                setCurrentMoveStep={setCurrentMoveStep}
                isPlayingReplay={isPlayingReplay}
                setIsPlayingReplay={setIsPlayingReplay}
              />
            </ScrollView>
          </View>
        </Modal>
      </View>
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#0a0e1a" },

  // Header Style (Same as gameplay header)
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  toggleBtnActive: {
    backgroundColor: "#00BFFF",
  },
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
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 0,
    flexDirection: "row",
    gap: 22,
    alignItems: "stretch",
    overflow: "hidden",
    position: "relative",
  },
  drawerBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end",
    zIndex: 1200,
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 6, 14, 0.58)",
  },
  drawerPanel: {
    width: 380,
    maxWidth: "92%",
    height: "100%",
    backgroundColor: "#0A0F1A",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    zIndex: 2,
    ...(Platform.OS === "web" ? { boxShadow: "-12px 0 36px rgba(0, 0, 0, 0.55)" } as any : {}),
  },
  stickySidebarScrollLeft: {
    width: 260,
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  stickySidebarScrollRight: {
    width: 340,
    maxWidth: "36%",
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
  },
  centerScrollContainer: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    maxHeight: "100%",
  },
  centerScrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  mainScrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 40, paddingVertical: 24, gap: 24 },
  pageContentWrapper: {
    width: "100%",
    gap: 24,
  },
  threeColumnRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", width: "100%" },

  // Sidebar Layout (Same as gameplay left sidebar)
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
  centerColumn: { flex: 1, minWidth: 0, width: "100%", maxWidth: 1120, alignSelf: "center", gap: 16 },
  titleRowContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, position: "relative", zIndex: 1000 },
  mainTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.4, flexShrink: 1, minWidth: 0 },
  subTitle: { color: "#8B8FA8", fontSize: 13, fontWeight: "500", marginTop: 3 },
  segmentedBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    backgroundColor: "#0A0F1A",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    alignSelf: "flex-start",
  },
  segmentedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentedPillActive: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    borderColor: "rgba(0, 218, 243, 0.35)",
  },
  segmentedText: { color: "#94A3B8", fontSize: 12.5, fontWeight: "700" },
  segmentedTextActive: { color: "#00DAF3", fontWeight: "800" },
  segmentedCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  segmentedCountActive: { backgroundColor: "rgba(0, 218, 243, 0.2)" },
  segmentedCountText: { color: "#64748B", fontSize: 10.5, fontWeight: "800" },
  segmentedCountTextActive: { color: "#00DAF3" },

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
    cursor: "pointer",
  } as any,
  filterDropdownText: { color: "#fff", fontSize: 13, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  dropdownMenu: {
    position: "absolute",
    top: 52,
    right: 0,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    width: 155,
    padding: 6,
    zIndex: 1001,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
    } as any : {
      elevation: 20,
    }),
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    cursor: "pointer",
  } as any,
  dropdownItemActive: {
    backgroundColor: "rgba(0, 191, 255, 0.12)",
  },
  dropdownItemText: { color: "#94A3B8", fontSize: 13, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  dropdownItemTextActive: { color: "#FFFFFF", fontWeight: "800" },

  // Stats Card Grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, width: "100%" },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1320",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#16162A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCardLabel: { color: "#8B8FA8", fontSize: 11, fontWeight: "600" },
  statCardVal: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 2 },

  // Match History Unified Card & Rows
  historyListCard: {
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 8,
  },
  matchCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  matchCardRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  matchCardRowSelected: {
    backgroundColor: "rgba(0, 218, 243, 0.07)",
    borderColor: "rgba(0, 218, 243, 0.35)",
  },
  matchGameIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#16162A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtleGameTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  subtleGameTagText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
  },
  outcomePillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Match History Cards
  matchCardContainer: {
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  matchCardContainerSelected: {
    borderColor: "#00DAF3",
    backgroundColor: "rgba(0, 218, 243, 0.04)",
  },
  matchIndicatorBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  matchHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  matchResultText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  modeBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modeBadgeText: { color: "rgba(255, 255, 255, 0.6)", fontSize: 9, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  betAmountText: { color: "#f5b642", fontSize: 13, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  dateText: { color: "#8b93a7", fontSize: 11, fontWeight: "600", fontFamily: "Inter, sans-serif" },

  // Match Expanded body
  matchExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  expandedPlayersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginBottom: 24,
  },
  expandedPlayerCard: {
    width: 140,
    backgroundColor: "#0d1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 16,
    alignItems: "center",
  },
  expandedAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  expandedAvatarText: { color: "#fff", fontSize: 13, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  playerNameText: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  playerRoleLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "600", marginTop: 2, fontFamily: "Inter, sans-serif" },
  markBlock: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  markBlockX: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 0.5, borderColor: "rgba(239, 68, 68, 0.2)" },
  markBlockO: { backgroundColor: "rgba(34, 197, 94, 0.1)", borderWidth: 0.5, borderColor: "rgba(34, 197, 94, 0.2)" },
  markText: { fontSize: 14, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  playerOutcomeLabel: { fontSize: 11, fontWeight: "800", fontFamily: "Inter, sans-serif" },

  vsDividerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(124, 58, 237, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: { color: "#FF1744", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },

  expandedDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0d1220",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  detailMetaGroup: { alignItems: "center", flex: 1 },
  detailMetaLabel: { color: "#8b93a7", fontSize: 8, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  detailMetaVal: { color: "#fff", fontSize: 11, fontWeight: "800", marginTop: 4, fontFamily: "Inter, sans-serif" },

  // Pagination Controls
  paginationRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 },
  pageBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageNumberBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumberBtnActive: { backgroundColor: "#00BFFF", borderColor: "#00BFFF" },
  pageNumberText: { color: "#8b93a7", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  pageNumberTextActive: { color: "#ffffff" },

  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "rgba(255,255,255,0.4)", fontWeight: "bold", fontSize: 13, fontFamily: "Inter, sans-serif" },

  // Right sidebar details panel
  rightSidebar: { width: "100%" },
  leaderboardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  leaderboardTitle: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  detailBadgeText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  sideVsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#0d1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  sideAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sideAvatarText: { color: "#fff", fontSize: 12, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  sidePlayerName: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  sideMarkIndicator: { color: "#8b93a7", fontSize: 9, fontWeight: "600", marginTop: 2, fontFamily: "Inter, sans-serif" },
  sideVsText: { color: "#8b93a7", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },

  statLinesGroup: { gap: 12, marginBottom: 20 },
  statLineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLineLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  statLineVal: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  boardTitleHeader: { color: "#8b93a7", fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "Inter, sans-serif" },
  boardContainerCenter: { alignItems: "center", marginBottom: 24 },
  boardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 220,
    height: 220,
    gap: 8,
  },
  boardCell: {
    width: 68,
    height: 68,
    backgroundColor: "#0d1220",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1f2540",
  },
  boardCellX: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  boardCellO: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  boardCellText: { fontSize: 24, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  boardCellTextX: { color: "#ef4444" },
  boardCellTextO: { color: "#22c55e" },

  playAgainBtn: {
    backgroundColor: "#00BFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  playAgainBtnText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

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
  mobileMatchRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#12172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 16,
    marginBottom: 12,
  },
  mobileOutcomePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  mobileOutcomeText: { fontWeight: "900", fontSize: 10, fontFamily: "Inter, sans-serif" },
  mobileStatCard: {
    backgroundColor: "#12172a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f2540",
    padding: 12,
  },
  mobileStatLabel: { color: "#8b93a7", fontSize: 8, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  mobileStatVal: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 4, fontFamily: "Inter, sans-serif" },
  replayControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  replayControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
  },
  replayPlayBtn: {
    backgroundColor: "#22d3ee",
    borderColor: "#22d3ee",
  },
  replayStepText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    fontFamily: "Inter, sans-serif",
  },
});
