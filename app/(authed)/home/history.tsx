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
import ScreenWrapper from "../../../components/ScreenWrapper";
import { WebPressable } from "../../../components/WebPressable";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import ProfileEditModal from "../../../components/ProfileEditModal";
import ReferralModal from "../../../components/ReferralModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { SkeletonRow } from "../../../components/SkeletonLoading";

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

  // Page States
  const [gameType, setGameType] = useState<"xo" | "spin">("xo");
  const [spinHistory, setSpinHistory] = useState<any[]>([]);
  const [spinLoading, setSpinLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 6;

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
        body: JSON.stringify({ limit: 100 }), // Load last 100 games for better pagination
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load history");
      const fetchedGames = Array.isArray(data?.history) ? data.history : [];
      setGames(fetchedGames);

      // Default selected game to the first one in the list
      if (fetchedGames.length > 0 && !selectedGameId) {
        setSelectedGameId(fetchedGames[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Could not fetch history");
    } finally {
      setLoading(false);
    }
  }, [token, selectedGameId]);

  const fetchSpinHistory = useCallback(async () => {
    if (!token) return;
    try {
      setSpinLoading(true);
      const res = await fetch(`${API_URL}/spin/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSpinHistory(data.history || []);
      }
    } catch (e) {
      console.error('[SPIN_HISTORY_ERR]', e);
    } finally {
      setSpinLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
    fetchSpinHistory();
  }, [fetchHistory, fetchSpinHistory]);

  const summary = useMemo(() => {
    const wins = user?.total_wins || 0;
    const totalCount = user?.total_games || 0;
    const losses = Math.max(0, totalCount - wins);
    return {
      wins,
      losses,
      total: totalCount,
      winRate: totalCount ? Math.round((wins / totalCount) * 100) : 0,
    };
  }, [user]);

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

  // Filter & Pagination Calculations
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const isWin = g.is_winner === true ||
        (g.is_winner === undefined && g.winner != null && String(g.winner).toLowerCase() === String(myId || '').toLowerCase());
      if (filter === "win") return isWin;
      if (filter === "loss") return !isWin;
      return true;
    });
  }, [games, filter, myId]);

  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * gamesPerPage;
    return filteredGames.slice(startIndex, startIndex + gamesPerPage);
  }, [filteredGames, currentPage, gamesPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));

  // Determine currently selected game object
  const selectedGame = useMemo(() => {
    if (!selectedGameId && games.length > 0) return games[0];
    return games.find(g => g.id === selectedGameId) || null;
  }, [selectedGameId, games]);

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
        setCurrentMoveStep(prev => {
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

  // Expand detail trigger
  const handleSelectGame = (id: string) => {
    setSelectedGameId(id);
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

        {/* ── HEADER BAR ── */}
        <View style={s.header}>
          <View style={s.headerContentWrapper}>
            {/* Left: Logo */}
            <View style={s.logoContainer}>
              <Image source={require("../../../assets/images/icon.jpg")} style={s.logoImage} />
              <Text style={s.logoText}>XO ETHIOPIA</Text>
            </View>

            {/* Center: Toggle Pill */}
            <View style={s.toggleContainer}>
              <TouchableOpacity
                style={s.toggleBtn}
                onPress={() => router.push('/(authed)/home/gameplay')}
                activeOpacity={0.85}
              >
                <Text style={s.toggleBtnText}>SPIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, s.toggleBtnActive, Platform.OS === 'web' ? { background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)" } as any : undefined]}
                onPress={() => router.push('/(authed)/home/gameplay')}
                activeOpacity={0.85}
              >
                <Text style={[s.toggleBtnText, s.toggleBtnTextActive]}>XO GAME</Text>
              </TouchableOpacity>
            </View>

            {/* Right: Utility Cluster */}
            <View style={s.utilityCluster}>

              <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name="cloud-download-outline" size={16} color="#8b93a7" />
                <Text style={s.utilityBtnText}>APP</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLanguageToggle} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name="globe-outline" size={15} color="#8b93a7" />
                <Text style={s.utilityBtnText}>{language.toUpperCase()}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMusic} style={s.utilityBtn} activeOpacity={0.8}>
                <Ionicons name={isPlaying ? "volume-high-outline" : "volume-mute-outline"} size={16} color="#8b93a7" />
                <Text style={s.utilityBtnText}>{isPlaying ? "SOUND" : "MUTED"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={s.bellBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount}</Text></View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.profileChip} activeOpacity={0.85}>
                <View style={s.profileChipAvatar}>
                  <Text style={s.profileChipAvatarText}>{user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}</Text>
                </View>
                <View style={{ marginRight: 6 }}>
                  <Text style={s.profileChipName}>{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                  <Text style={s.profileChipVip}>VIP 24</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── CORE BODY CONTAINER ── */}
        <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.pageContentWrapper}>
            <View style={s.threeColumnRow}>
              {/* 1. LEFT SIDEBAR (fixed width 280px) */}
              <View style={s.leftSidebar}>
                <View style={s.card}>
                  <View style={s.userCardHeader}>
                    <View style={s.userCardAvatar}>
                      <Text style={s.userCardAvatarText}>{user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}</Text>
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
                      <Text style={[s.tokenVal, { color: "#22d3ee" }]}>ETB {user?.available_balance ? Number(user.available_balance).toLocaleString() : "0"}</Text>
                    </View>
                    <TouchableOpacity onPress={refreshProfile} style={[s.tokenPlusBtn, { backgroundColor: "rgba(34, 211, 238, 0.15)", borderColor: "rgba(34, 211, 238, 0.3)", borderWidth: 1 }]} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={12} color="#22d3ee" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Vertical Navigation Links */}
                <View style={s.card}>
                  <TouchableOpacity onPress={() => handleNavClick('home')} style={s.navItem} activeOpacity={0.8}>
                    <Ionicons name="home-outline" size={18} color="#8b93a7" />
                    <Text style={s.navText}>Home</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleNavClick('history')} style={[s.navItem, s.navItemActive]} activeOpacity={0.8}>
                    <View style={s.navItemActiveBar} />
                    <Ionicons name="time" size={18} color="#8b5cf6" />
                    <Text style={[s.navText, s.navTextActive]}>History</Text>
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
                <View style={s.card}>
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

                  <View style={s.walletButtons}>
                    <TouchableOpacity onPress={() => setDepositVisible(true)} style={[s.walletBtnSmall, { borderColor: "#22d3ee" }]} activeOpacity={0.8}>
                      <Text style={[s.walletBtnTextSmall, { color: "#22d3ee" }]}>DEPOSIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setWithdrawVisible(true)} style={[s.walletBtnSmall, { borderColor: "#7c3aed" }]} activeOpacity={0.8}>
                      <Text style={[s.walletBtnTextSmall, { color: "#7c3aed" }]}>WITHDRAW</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Redundant Profile card removed */}
              </View>

              {/* 2. CENTER COLUMN */}
              <View style={s.centerColumn}>
                {/* Game Type Mode Tabs */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => setGameType('xo')}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: gameType === 'xo' ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: gameType === 'xo' ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Ionicons name="game-controller" size={16} color={gameType === 'xo' ? '#fff' : '#8b93a7'} />
                    <Text style={{ color: gameType === 'xo' ? '#fff' : '#8b93a7', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>
                      XO TIC-TAC-TOE
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setGameType('spin')}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: gameType === 'spin' ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: gameType === 'spin' ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Ionicons name="disc-outline" size={16} color={gameType === 'spin' ? '#fff' : '#8b93a7'} />
                    <Text style={{ color: gameType === 'spin' ? '#fff' : '#8b93a7', fontSize: 13, fontWeight: '800', fontFamily: 'Inter, sans-serif' }}>
                      5-PLAYER SPIN
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title and Filter Row */}
                <View style={s.titleRowContainer}>
                  <View>
                    <Text style={s.mainTitle}>{gameType === 'xo' ? 'XO MATCH HISTORY' : 'SPIN WHEEL HISTORY'}</Text>
                    <Text style={s.subTitle}>{gameType === 'xo' ? 'Analyze your performance and past XO matches' : 'Review your past Spin rounds, entry pots, and winners'}</Text>
                  </View>

                  {/* Filter Dropdown */}
                  {gameType === 'xo' && (
                    <View style={{ zIndex: 100 }}>
                      <TouchableOpacity onPress={() => setDropdownOpen(!dropdownOpen)} style={s.filterDropdown} activeOpacity={0.85}>
                        <Ionicons name="funnel-outline" size={14} color="#8b93a7" style={{ marginRight: 6 }} />
                        <Text style={s.filterDropdownText}>
                          {filter === "all" ? "All Games" : (filter === "win" ? "Victory" : "Defeat")}
                        </Text>
                        <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={14} color="#8b93a7" />
                      </TouchableOpacity>
                      {dropdownOpen && (
                        <View style={s.dropdownMenu}>
                          <TouchableOpacity onPress={() => { setFilter("all"); setDropdownOpen(false); setCurrentPage(1); }} style={s.dropdownItem}>
                            <Text style={s.dropdownItemText}>All Games</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setFilter("win"); setDropdownOpen(false); setCurrentPage(1); }} style={s.dropdownItem}>
                            <Text style={s.dropdownItemText}>Victory</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setFilter("loss"); setDropdownOpen(false); setCurrentPage(1); }} style={s.dropdownItem}>
                            <Text style={s.dropdownItemText}>Defeat</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Stats Row */}
                <View style={s.statsGrid}>
                  {/* Card 1 */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(34, 211, 238, 0.1)" }]}>
                      <Ionicons name="layers" size={18} color="#22d3ee" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>TOTAL GAMES</Text>
                      <Text style={s.statCardVal}>{summary.total}</Text>
                    </View>
                  </View>
                  {/* Card 2 */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(168, 85, 247, 0.1)" }]}>
                      <Ionicons name="trending-up" size={18} color="#a855f7" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>WIN RATE</Text>
                      <Text style={s.statCardVal}>{summary.winRate}%</Text>
                    </View>
                  </View>
                  {/* Card 3 */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(34, 197, 94, 0.1)" }]}>
                      <Ionicons name="trophy" size={18} color="#22c55e" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>WINS</Text>
                      <Text style={[s.statCardVal, { color: "#22c55e" }]}>{summary.wins}</Text>
                    </View>
                  </View>
                  {/* Card 4 */}
                  <View style={s.statCard}>
                    <View style={[s.statIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                      <Ionicons name="skull" size={18} color="#ef4444" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.statCardLabel}>LOSSES</Text>
                      <Text style={[s.statCardVal, { color: "#ef4444" }]}>{summary.losses}</Text>
                    </View>
                  </View>
                </View>

                {/* Match Rows List */}
                <View style={{ gap: 14 }}>
                  {gameType === 'spin' ? (
                    spinLoading ? (
                      <View style={{ gap: 8 }}>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </View>
                    ) : spinHistory.length === 0 ? (
                      <View style={s.emptyState}>
                        <Ionicons name="disc-outline" size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
                        <Text style={s.emptyStateText}>{isEN ? "No spin history found." : "ምንም የስፒን ጨዋታ ታሪክ የለም።"}</Text>
                      </View>
                    ) : (
                      spinHistory.map((item: any, idx: number) => {
                        const isWin = item.is_winner;
                        const statusColor = isWin ? "#34d399" : "#ef4444";
                        const modeLabel = item.mode_label || (item.config_id === 2 ? "Rail Spin" : "5-Player Spin");
                        const pot = Number(item.pot_amount || 0);
                        const prize = Number(item.prize_amount || 0);
                        const houseCut = Number(item.house_cut || Math.max(0, pot - prize));
                        const playersList = Array.isArray(item.players) ? item.players : [];

                        return (
                          <View key={item.round_id || idx} style={[s.matchCardContainer, { padding: 16 }]}>
                            <View style={[s.matchIndicatorBar, { backgroundColor: statusColor }]} />
                            
                            {/* Top row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: isWin ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: isWin ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)' }}>
                                  <Text style={{ color: statusColor, fontSize: 11, fontWeight: '900' }}>{isWin ? 'VICTORY' : 'DEFEAT'}</Text>
                                </View>
                                <Text style={{ color: '#00daf3', fontSize: 12, fontWeight: '800' }}>{modeLabel.toUpperCase()}</Text>
                              </View>
                              <Text style={{ color: '#8b93a7', fontSize: 11, fontWeight: '600' }}>{formatWhen(item.created_at)}</Text>
                            </View>

                            {/* Prize & Pot details */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                              <View>
                                <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '700' }}>WINNER: <Text style={{ color: '#fff', fontWeight: '800' }}>{item.winner_name || '—'}</Text></Text>
                                <Text style={{ color: '#8b93a7', fontSize: 10, fontWeight: '700', marginTop: 2 }}>ENTRY FEE: <Text style={{ color: '#22d3ee', fontWeight: '800' }}>{item.bet_amount || 100} ETB</Text></Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: isWin ? '#34d399' : '#fff', fontSize: 14, fontWeight: '900' }}>
                                  {isWin ? `+${prize} ETB` : `Prize: ${prize} ETB`}
                                </Text>
                                <Text style={{ color: '#8b93a7', fontSize: 10, marginTop: 2 }}>
                                  Pot: {pot} ETB | House Cut: {houseCut} ETB
                                </Text>
                              </View>
                            </View>

                            {/* Player Seats List */}
                            {playersList.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
                                {playersList.map((p: any, pIdx: number) => {
                                  const isWinnerPlayer = p.username === item.winner_name;
                                  return (
                                    <View key={pIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isWinnerPlayer ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: isWinnerPlayer ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                      <Ionicons name={isWinnerPlayer ? "trophy" : "person"} size={11} color={isWinnerPlayer ? "#34d399" : "#8b93a7"} />
                                      <Text style={{ color: isWinnerPlayer ? "#34d399" : "#e2e8f0", fontSize: 10, fontWeight: "700" }}>
                                        {p.username || `Player ${pIdx + 1}`} {p.isBot ? "(Bot)" : ""}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )
                  ) : (
                    <>
                      {loading && (
                        <View style={{ gap: 8 }}>
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                          <SkeletonRow />
                        </View>
                      )}
                      {!loading && paginatedGames.length === 0 && (
                        <View style={s.emptyState}>
                          <Ionicons name="game-controller-outline" size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
                          <Text style={s.emptyStateText}>{isEN ? "No matches found matching this filter." : "በዚህ ማጣሪያ የተጫወቱት ጨዋታ የለም።"}</Text>
                        </View>
                      )}
                      {paginatedGames.map((game) => {
                        const isWin = game.is_winner === true ||
                          (game.is_winner === undefined && game.winner != null && String(game.winner).toLowerCase() === String(myId || '').toLowerCase());
                        const isSelected = selectedGameId === game.id;
                        const statusColor = isWin ? "#22c55e" : "#ef4444";
                        const statusText = isWin ? "VICTORY" : "DEFEAT";
                        const statusIconName = isWin ? "trophy" : "skull";
                        const isPlayerX = game.players && game.players[0] === myId;
                        const myMark = isPlayerX ? "X" : "O";
                        const oppMark = myMark === "X" ? "O" : "X";
                        const opponentName = isPlayerX ? game.po_name || "Opponent" : game.px_name || "Opponent";
                        const duration = getDuration(game.created_at, game.finished_at);
                        const roomId = `XO-${game.id.slice(-4).toUpperCase()}`;

                        return (
                          <View 
                            key={game.id} 
                            style={[s.matchCardContainer, isSelected && s.matchCardContainerSelected]}
                          >
                            {/* Side Bar color indicator */}
                            <View style={[s.matchIndicatorBar, { backgroundColor: statusColor }]} />

                            <TouchableOpacity 
                              onPress={() => handleSelectGame(game.id)}
                              activeOpacity={0.9}
                              style={s.matchHeaderRow}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Ionicons name={statusIconName} size={16} color={statusColor} />
                                <View>
                                  <Text style={[s.matchResultText, { color: statusColor }]}>
                                    {statusText} <Text style={{ color: "#8b93a7", fontSize: 13, fontWeight: "600" }}>vs {opponentName}</Text>
                                  </Text>
                                </View>
                              </View>

                              <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
                                <View style={s.modeBadge}>
                                  <Text style={s.modeBadgeText}>
                                    {game.bet_amount >= 1000 ? "LEGEND" : (game.bet_amount >= 100 ? "PRO" : "STARTER")}
                                  </Text>
                                </View>
                                <Text style={s.betAmountText}>ETB {game.bet_amount}</Text>
                                <Text style={s.dateText}>{formatWhen(game.created_at)}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#8b93a7" />
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
                          activeOpacity={0.9}
                          style={s.matchHeaderRow}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Ionicons name={statusIconName} size={16} color={statusColor} />
                            <View>
                              <Text style={[s.matchResultText, { color: statusColor }]}>
                                {statusText} <Text style={{ color: "#8b93a7", fontSize: 13, fontWeight: "600" }}>vs {opponentName}</Text>
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 24 }}>
                            <View style={s.modeBadge}>
                              <Text style={s.modeBadgeText}>
                                {game.bet_amount >= 1000 ? "LEGEND" : (game.bet_amount >= 100 ? "PRO" : "STARTER")}
                              </Text>
                            </View>
                            <Text style={s.betAmountText}>ETB {game.bet_amount}</Text>
                            <Text style={s.dateText}>{formatWhen(game.created_at)}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#8b93a7" />
                          </View>
                        </TouchableOpacity>
                      </View>
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

              {/* 3. RIGHT SIDEBAR — MATCH DETAILS */}
              <View style={s.rightSidebar}>
                {selectedGame ? (() => {
                  const isWin = selectedGame.is_winner === true ||
                    (selectedGame.is_winner === undefined && selectedGame.winner != null && String(selectedGame.winner).toLowerCase() === String(myId || '').toLowerCase());
                  const statusColor = isWin ? "#22c55e" : "#ef4444";
                  const statusText = isWin ? "VICTORY" : "DEFEAT";
                  const isPlayerX = selectedGame.players && selectedGame.players[0] === myId;
                  const myMark = isPlayerX ? "X" : "O";
                  const oppMark = myMark === "X" ? "O" : "X";
                  const opponentName = isPlayerX ? selectedGame.po_name || "Opponent" : selectedGame.px_name || "Opponent";
                  const duration = getDuration(selectedGame.created_at, selectedGame.finished_at);
                  const roomId = `XO-${selectedGame.id.slice(-4).toUpperCase()}`;
                  const boardState = getBoardForStep(selectedGame.moves, currentMoveStep);

                  return (
                    <View style={[s.card, { flex: 1 }]}>
                      {/* Sidebar Header */}
                      <View style={s.leaderboardHeader}>
                        <Text style={s.leaderboardTitle}>MATCH DETAILS</Text>
                        <TouchableOpacity onPress={() => setSelectedGameId(null)}>
                          <Ionicons name="close" size={18} color="#8b93a7" />
                        </TouchableOpacity>
                      </View>

                      {/* Outcome Badge Row */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 20 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name={isWin ? "trophy" : "skull"} size={16} color={statusColor} />
                          <Text style={[s.detailBadgeText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                        <View style={s.modeBadge}>
                          <Text style={s.modeBadgeText}>
                            {selectedGame.bet_amount >= 1000 ? "LEGEND" : (selectedGame.bet_amount >= 100 ? "PRO" : "STARTER")}
                          </Text>
                        </View>
                      </View>

                      {/* Opponent VS card */}
                      <View style={s.sideVsContainer}>
                        <View style={{ alignItems: "center", width: 90 }}>
                          <View style={s.sideAvatar}>
                            <Text style={s.sideAvatarText}>{user?.username ? user.username.slice(0, 1).toUpperCase() : "M"}</Text>
                          </View>
                          <Text style={s.sidePlayerName} numberOfLines={1}>@{user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}</Text>
                          <Text style={s.sideMarkIndicator}>Mark: {myMark}</Text>
                        </View>

                        <Text style={s.sideVsText}>VS</Text>

                        <View style={{ alignItems: "center", width: 90 }}>
                          <View style={[s.sideAvatar, { backgroundColor: "#f5b642" }]}>
                            <Text style={s.sideAvatarText}>{opponentName.slice(0, 1).toUpperCase()}</Text>
                          </View>
                          <Text style={s.sidePlayerName} numberOfLines={1}>@{opponentName}</Text>
                          <Text style={s.sideMarkIndicator}>Mark: {oppMark}</Text>
                        </View>
                      </View>

                      {/* Stat Lines */}
                      <View style={s.statLinesGroup}>
                        <View style={s.statLineRow}>
                          <Text style={s.statLineLabel}>BET AMOUNT</Text>
                          <Text style={s.statLineVal}>ETB {selectedGame.bet_amount}</Text>
                        </View>
                        <View style={s.statLineRow}>
                          <Text style={s.statLineLabel}>MATCH ID</Text>
                          <Text style={s.statLineVal}>#XO-{selectedGame.id.slice(-8).toUpperCase()}</Text>
                        </View>
                        <View style={s.statLineRow}>
                          <Text style={s.statLineLabel}>ROOM ID</Text>
                          <Text style={s.statLineVal}>{roomId}</Text>
                        </View>
                        <View style={s.statLineRow}>
                          <Text style={s.statLineLabel}>DURATION</Text>
                          <Text style={s.statLineVal}>{duration}</Text>
                        </View>
                        <View style={s.statLineRow}>
                          <Text style={s.statLineLabel}>DATE & TIME</Text>
                          <Text style={s.statLineVal}>{formatWhen(selectedGame.created_at)}</Text>
                        </View>
                      </View>

                      {/* Game Board grid */}
                      <Text style={s.boardTitleHeader}>GAME BOARD</Text>
                      <View style={s.boardContainerCenter}>
                        <View style={s.boardGrid}>
                          {boardState.map((cell, idx) => {
                            const isCellX = cell === "X";
                            const isCellO = cell === "O";
                            return (
                              <View 
                                key={idx} 
                                style={[
                                  s.boardCell, 
                                  isCellX && s.boardCellX, 
                                  isCellO && s.boardCellO
                                ]}
                              >
                                <Text 
                                  style={[
                                    s.boardCellText, 
                                    isCellX && s.boardCellTextX, 
                                    isCellO && s.boardCellTextO
                                  ]}
                                >
                                  {cell || ""}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Step Indicator */}
                      <Text style={s.replayStepText}>
                        Move {currentMoveStep} of {selectedGame.moves ? selectedGame.moves.length : 0}
                      </Text>

                      {/* Replay Controls (Backward, Play/Pause, Forward) */}
                      <View style={s.replayControlsRow}>
                        {/* Backward Button */}
                        <TouchableOpacity 
                          onPress={() => {
                            setIsPlayingReplay(false);
                            setCurrentMoveStep(prev => Math.max(0, prev - 1));
                          }}
                          style={s.replayControlBtn}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="play-back" size={16} color="#fff" />
                        </TouchableOpacity>

                        {/* Play/Pause Button */}
                        <TouchableOpacity 
                          onPress={() => {
                            if (currentMoveStep >= selectedGame.moves.length) {
                              setCurrentMoveStep(0);
                              setIsPlayingReplay(true);
                            } else {
                              setIsPlayingReplay(!isPlayingReplay);
                            }
                          }}
                          style={[s.replayControlBtn, s.replayPlayBtn]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={isPlayingReplay ? "pause" : "play"} size={18} color="#0a0e1a" />
                        </TouchableOpacity>

                        {/* Forward Button */}
                        <TouchableOpacity 
                          onPress={() => {
                            setIsPlayingReplay(false);
                            setCurrentMoveStep(prev => Math.min(selectedGame.moves.length, prev + 1));
                          }}
                          style={s.replayControlBtn}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="play-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      {/* Play Again button removed */}
                    </View>
                  );
                })() : (
                  <View style={[s.card, { flex: 1, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="information-circle-outline" size={32} color="rgba(255,255,255,0.2)" />
                    <Text style={{ color: "rgba(255,255,255,0.3)", marginTop: 10, fontSize: 13, fontFamily: "Inter, sans-serif" }}>Select a match to view details</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
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
          <TouchableOpacity onPress={() => router.back()} style={s.mobileBackBtn}>
            <Ionicons name="arrow-back" size={20} color="#00daf3" />
          </TouchableOpacity>
          <Text style={s.mobileTitleText}>Match History</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Sticky Mobile Stat Cards */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 12 }}>
          {/* Stat Cards in 2x2 grid for mobile */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>GAMES</Text>
              <Text style={s.mobileStatVal}>{summary.total}</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>WIN RATE</Text>
              <Text style={s.mobileStatVal}>{summary.winRate}%</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>WINS</Text>
              <Text style={[s.mobileStatVal, { color: "#22c55e" }]}>{summary.wins}</Text>
            </View>
            <View style={[s.mobileStatCard, { flex: 1, minWidth: "45%" }]}>
              <Text style={s.mobileStatLabel}>LOSSES</Text>
              <Text style={[s.mobileStatVal, { color: "#ef4444" }]}>{summary.losses}</Text>
            </View>
          </View>
        </View>

        {/* Mobile Filter Bar */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>FILTER BY</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setFilter("all")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: filter === "all" ? "#8b5cf6" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "all" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.05)"
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "all" ? "#fff" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter("win")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: filter === "win" ? "#22c55e" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "win" ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.05)"
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "win" ? "#22c55e" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>Victory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter("loss")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: filter === "loss" ? "#ef4444" : "rgba(255,255,255,0.1)",
                backgroundColor: filter === "loss" ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)"
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: filter === "loss" ? "#ef4444" : "#8b93a7", fontSize: 11, fontWeight: "800" }}>Defeat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile content - scrollable list */}
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isWin = item.is_winner === true ||
              (item.is_winner === undefined && item.winner != null && String(item.winner).toLowerCase() === String(myId || '').toLowerCase());
            const statusColor = isWin ? "#22c55e" : "#ef4444";
            const statusLabel = isWin ? "VICTORY" : "DEFEAT";

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ 
                  pathname: "/(authed)/games/[id]", 
                  params: { 
                    id: item.id, 
                    bet: String(item.bet_amount), 
                    created_at: item.created_at, 
                    moves: encodeURIComponent(JSON.stringify(item.moves || [])), 
                    p1: Array.isArray(item.players) ? item.players[0] : String(item.players), 
                    p2: Array.isArray(item.players) ? item.players[1] : "", 
                    px_name: item.px_name || item.px_num || "", 
                    po_name: item.po_name || item.po_num || "" 
                  } 
                } as any)}
                style={s.mobileMatchRowCard}
              >
                <View style={[s.mobileOutcomePill, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }]}>
                  <Ionicons name={isWin ? "trophy" : "skull"} size={12} color={statusColor} />
                  <Text style={[s.mobileOutcomeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>vs {isWin ? item.po_name || "Opponent" : item.px_name || "Opponent"}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>{formatWhen(item.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#f5b642", fontWeight: "900", fontSize: 13 }}>ETB {item.bet_amount}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
  toggleBtnActive: {
    backgroundColor: "#7c3aed",
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
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Scroll View & Layout blueprints
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
    backgroundColor: "#8b5cf6",
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
  navItemActive: { backgroundColor: "rgba(124, 58, 237, 0.08)" },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    backgroundColor: "#7c3aed",
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
  mainTitle: { color: "#8b5cf6", fontSize: 36, fontWeight: "900", letterSpacing: -0.5, fontFamily: "Inter, sans-serif" },
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

  // Stats Card Grid
  statsGrid: { flexDirection: "row", gap: 16 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  statCardVal: { color: "#22d3ee", fontSize: 22, fontWeight: "900", marginTop: 2, fontFamily: "Inter, sans-serif" },

  // Match History Cards
  matchCardContainer: {
    backgroundColor: "#12172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2540",
    overflow: "hidden",
  },
  matchCardContainerSelected: {
    borderColor: "#1f2540",
    ...(Platform.OS === 'web' ? { boxShadow: "0 0 25px rgba(255, 255, 255, 0.02)" } as any : {}),
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
    backgroundColor: "#8b5cf6",
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
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(124, 58, 237, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: { color: "#a855f7", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },

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
  pageNumberBtnActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  pageNumberText: { color: "#8b93a7", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  pageNumberTextActive: { color: "#ffffff" },

  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "rgba(255,255,255,0.4)", fontWeight: "bold", fontSize: 13, fontFamily: "Inter, sans-serif" },

  // Right sidebar details panel
  rightSidebar: { width: 320 },
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
    backgroundColor: "#8b5cf6",
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
    backgroundColor: "#7c3aed",
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
