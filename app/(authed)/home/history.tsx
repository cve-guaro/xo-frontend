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
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import ScreenWrapper from "../../../components/ScreenWrapper";
import AnimatedList from "../../../components/AnimatedList";

// ---- Types ----
type Move = { ts: string; user: string; index: number; symbol: "X" | "O" };
type Game = {
  id: string;
  created_at: string;
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

const THEME = {
  bgSurface: '#0A090E',
  onSurface: '#ffffff',
  surfaceContainerLow: '#14131A',
  surfaceContainer: '#1B1A24',
  surfaceVariant: '#252535',
  surfaceBright: '#323247',
  primary: '#00daf3',
  primaryDim: '#00daf3',
  primaryContainer: '#00daf3',
  onPrimaryContainer: '#0a0a0f',
  secondary: '#00daf3',
  onSurfaceVariant: '#CDCCF3',
  outlineVariant: '#56568A',
  error: '#ff4766',
  errorDim: '#ff4766'
};

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ---- Game helpers ----
function chunkMoves(moves: Move[]): Move[][] {
  const out: Move[][] = [];
  for (let i = 0; i < moves.length; i += 9) out.push(moves.slice(i, i + 9));
  return out;
}

function computeWinner(board: ("X" | "O" | "_")[]): "X" | "O" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== "_" && board[a] === board[b] && board[a] === board[c]) return board[a] as "X" | "O";
  }
  return null;
}

function formatWhen(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
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

// ---- UI Components (Memoized) ----
const StatCard = memo(({ label, value, icon, color, isDesktop }: { label: string; value: string; icon: any; color: string; isDesktop: boolean }) => (
  <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
    <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={StyleSheet.absoluteFill} />
    <View style={[styles.statIconWrap, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Ionicons name={icon} size={isDesktop ? 24 : 20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabelText}>{label}</Text>
      <Text style={[styles.statValueText, { color }]}>{value}</Text>
    </View>
    {isDesktop && <View style={[styles.statGlow, { backgroundColor: color }]} />}
  </View>
));

const MatchRow = memo(({ item, myId, router, isDesktop, onSelectGame, isSelected }: { item: Game; myId: string | null; router: any; isDesktop: boolean; onSelectGame?: (game: Game) => void; isSelected?: boolean }) => {
  const isWin = item.is_winner === true ||
    (item.is_winner === undefined && item.winner != null && String(item.winner).toLowerCase() === String(myId || '').toLowerCase());
  const statusColor = isWin ? "#00daf3" : "#fd6f85";
  const statusLabel = isWin ? "VICTORY" : "DEFEAT";

  const handleDetailsPress = () => {
    if (isDesktop && onSelectGame) {
      onSelectGame(item);
    } else {
      router.push({
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
      } as any);
    }
  };

  if (isDesktop) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleDetailsPress}
        style={[styles.desktopMatchCard, isSelected && styles.desktopMatchCardSelected]}
      >
        <LinearGradient colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        
        <View style={styles.desktopMatchMain}>
          <View style={{ width: 140 }}>
            <Text style={[styles.desktopStatusText, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={styles.desktopMatchId}>ID: {item.id.slice(-8).toUpperCase()}</Text>
          </View>

          <View style={styles.desktopMatchInfo}>
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>ROOM TIER</Text>
              <Text style={styles.infoValue}>{item.bet_amount >= 1000 ? "LEGEND" : (item.bet_amount >= 100 ? "PRO" : "STARTER")}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>BET AMOUNT</Text>
              <Text style={[styles.infoValue, { color: '#FDE047' }]}>ETB {item.bet_amount}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>DATE & TIME</Text>
              <Text style={styles.infoValue}>{formatWhen(item.created_at)}</Text>
            </View>
          </View>

          <View 
            style={[styles.detailsBtn, isSelected && { borderColor: '#00daf3', backgroundColor: 'rgba(0, 218, 243, 0.1)' }]}
          >
            <Text style={[styles.detailsBtnText, isSelected && { color: '#00daf3' }]}>DETAILS</Text>
            <Ionicons name="chevron-forward" size={14} color={isSelected ? "#00daf3" : "#fff"} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Mobile View
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleDetailsPress}
      style={styles.cardOuter}
    >
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={[styles.outcomePill, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={isWin ? "trophy" : "skull"} size={14} color={statusColor} />
            <Text style={[styles.outcomeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <View style={styles.betPill}>
            <Text style={styles.betText}>ETB {item.bet_amount}</Text>
          </View>
        </View>
        <View style={styles.cardBottomRow}>
          <Text style={styles.metaText}>{formatWhen(item.created_at)}</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ---- Side Replayer Panel ----
function SideReplayer({ game, myId, onClose }: { game: Game; myId: string | null; onClose?: () => void }) {
  const rounds = useMemo(() => chunkMoves(game.moves || []), [game.moves]);
  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const len = rounds[round]?.length ?? 0;

  useEffect(() => {
    setRound(0);
    setStep(0);
    setIsPlaying(false);
  }, [game.id]);

  useEffect(() => {
    setStep(0);
    setIsPlaying(false);
  }, [round]);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= len) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setStep(s => Math.min(s + 1, len));
    }, 700);
    return () => clearTimeout(timer);
  }, [isPlaying, step, len]);

  const togglePlay = () => {
    if (step >= len) {
      setStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const board = useMemo(() => {
    const b: ("X" | "O" | "_")[] = Array(9).fill("_");
    const m = rounds[round] ?? [];
    const upto = Math.min(step, m.length);
    for (let i = 0; i < upto; i++) b[m[i].index] = m[i].symbol;
    return b;
  }, [rounds, round, step]);

  const finishedWinner = useMemo(() => computeWinner(board), [board]);
  const lastMove = useMemo(() => {
    const m = rounds[round] ?? [];
    if (!m.length || step <= 0) return null;
    return m[Math.min(step - 1, m.length - 1)];
  }, [rounds, round, step]);

  const players = useMemo(() => {
    let p = [...(game.players || [])];
    return p.map((id, index) => {
      if (!id || id.length < 10) return id;
      if (id === myId) return "You";
      if (index === 0 && game.px_name) return game.px_name;
      if (index === 1 && game.po_name) return game.po_name;
      return id.slice(0, 6) + "..." + id.slice(-4);
    });
  }, [game.players, game.px_name, game.po_name, myId]);

  const next = () => { setIsPlaying(false); setStep(s => Math.min(s + 1, len)); };
  const prev = () => { setIsPlaying(false); setStep(s => Math.max(s - 1, 0)); };
  const toStart = () => { setIsPlaying(false); setStep(0); };
  const toEnd = () => { setIsPlaying(false); setStep(len); };

  const CELL = 74;

  if (!game.moves || !game.moves.length) {
    return (
      <View style={styles.replayerContainer}>
        <LinearGradient colors={['#111115', '#0A090E']} style={StyleSheet.absoluteFillObject} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="eye-off-outline" size={32} color="#00daf3" style={{ marginBottom: 12 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 }}>MATCH ABORTED</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', paddingHorizontal: 10 }}>
            No gameplay telemetry was recorded for this session.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.replayerContainer}>
      <LinearGradient colors={['#111115', '#0A090E']} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={styles.replayerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.replayerTitle}>MATCH REPLAY</Text>
          <Text style={styles.replayerSub}>ID: {game.id.slice(-8).toUpperCase()}</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.replayerClose}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Players */}
      <View style={styles.replayerPlayers}>
        <View style={styles.replayerPlayerPill}>
          <Ionicons name="close-circle-outline" size={14} color="#fd6f85" />
          <Text style={styles.replayerPlayerText} numberOfLines={1}>{players[0] || 'Player X'}</Text>
        </View>
        <Text style={styles.replayerVs}>VS</Text>
        <View style={[styles.replayerPlayerPill, { borderColor: 'rgba(0, 218, 243, 0.2)' }]}>
          <Ionicons name="radio-button-off-outline" size={14} color="#00daf3" />
          <Text style={[styles.replayerPlayerText, { color: '#00daf3' }]} numberOfLines={1}>{players[1] || 'Player O'}</Text>
        </View>
      </View>

      {/* Rounds selector */}
      {rounds.length > 1 && (
        <View style={styles.replayerRounds}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {rounds.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setRound(idx)}
                style={[styles.roundTab, round === idx && styles.roundTabActive]}
              >
                <Text style={[styles.roundTabText, round === idx && styles.roundTabTextActive]}>
                  ROUND {idx + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Grid Board */}
      <View style={styles.replayerBoard}>
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
              {[0, 1, 2].map((c) => {
                const idx = r * 3 + c;
                const v = board[idx];
                const isLast = lastMove?.index === idx && v !== '_';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.replayerCell,
                      { width: CELL, height: CELL },
                      isLast && styles.replayerCellActive,
                    ]}
                  >
                    {v === 'X' && (
                      <Ionicons name="close" size={CELL * 0.7} color="#fd6f85" />
                    )}
                    {v === 'O' && (
                      <Ionicons name="radio-button-off" size={CELL * 0.6} color="#00daf3" />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Progress & Telemetry */}
      <View style={styles.replayerStats}>
        <Text style={styles.replayerProgressText}>
          MOVE {step} OF {len}
        </Text>
        {finishedWinner ? (
          <Text style={[styles.replayerWinnerStatus, { color: finishedWinner === 'X' ? '#fd6f85' : '#00daf3' }]}>
            ROUND WINNER: {finishedWinner}
          </Text>
        ) : step === len && len > 0 ? (
          <Text style={styles.replayerDrawStatus}>DRAW</Text>
        ) : (
          <Text style={styles.replayerLiveStatus}>PLAYING...</Text>
        )}
      </View>

      {/* Playback Controls */}
      <View style={styles.replayerControls}>
        <TouchableOpacity onPress={toStart} style={styles.replayerControlBtn}>
          <Ionicons name="play-skip-back" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={prev} style={styles.replayerControlBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlay} style={styles.replayerPlayBtn}>
          <Ionicons name={isPlaying ? "pause" : (step === len ? "reload" : "play")} size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={next} style={styles.replayerControlBtn}>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toEnd} style={styles.replayerControlBtn}>
          <Ionicons name="play-skip-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MatchHistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const { user, token, language } = useAuth();
  const myId = user?.id ?? null;
  const isEN = language === "en";

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_URL}/account/history`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 40 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load history");
      const list = Array.isArray(data?.history) ? data.history : [];
      setGames(list);
      // Auto-select the first game on desktop if none selected
      if (isDesktop && list.length > 0 && !selectedGame) {
        setSelectedGame(list[0]);
      }
    } catch (e: any) {
      setError(e?.message || "Could not fetch history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isDesktop]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, [fetchHistory]);

  const summary = useMemo(() => {
    const wins = user?.total_wins || 0;
    const totalCount = user?.total_games || 0;
    const losses = totalCount - wins;
    return { wins, losses, total: totalCount, winRate: totalCount ? Math.round((wins / totalCount) * 100) : 0 };
  }, [user]);

  return (
    <ScreenWrapper edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <LinearGradient colors={["#0A090E", "#08070B", "#060508"]} style={StyleSheet.absoluteFill} />

        {/* Ambient Glows */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -150, left: -150, width: 600, height: 600, borderRadius: 300, backgroundColor: '#00daf3', opacity: 0.14 }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: -150, right: -150, width: 600, height: 600, borderRadius: 300, backgroundColor: '#ff2d55', opacity: 0.06 }} />
          <View pointerEvents="none" style={{ position: 'absolute', top: '30%', right: -200, width: 700, height: 700, borderRadius: 350, backgroundColor: '#a855f7', opacity: 0.06 }} />
        </View>

        {/* Background XO Illustrations */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Text style={{ position: 'absolute', top: '12%', left: '-15%', fontSize: 280, fontWeight: '900', color: '#00daf3', opacity: 0.03, transform: [{ rotate: '-15deg' }] }}>X</Text>
          <Text style={{ position: 'absolute', bottom: '18%', right: '-20%', fontSize: 320, fontWeight: '900', color: '#00daf3', opacity: 0.02, transform: [{ rotate: '25deg' }] }}>O</Text>
          <Text style={{ position: 'absolute', top: '55%', left: '30%', fontSize: 130, fontWeight: '900', color: '#00daf3', opacity: 0.015, transform: [{ rotate: '45deg' }] }}>X</Text>
          <Text style={{ position: 'absolute', top: '5%', right: '15%', fontSize: 95, fontWeight: '900', color: '#00daf3', opacity: 0.015, transform: [{ rotate: '-35deg' }] }}>O</Text>
        </View>

        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <StatusBar barStyle="light-content" />
          
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <View style={styles.titleRow}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => router.push("/(authed)/home/gameplay")}
                  style={styles.backBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color="#00daf3" />
                  <Text style={styles.backBtnText}>{isEN ? "Back" : "ተመለስ"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onRefresh}
                  style={styles.headerRefreshBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="reload" size={14} color="#00daf3" style={{ marginRight: 6 }} />
                  <Text style={styles.headerRefreshText}>{isEN ? "Refresh" : "አድስ"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.mainTitle}>{isEN ? "Match History" : "የጨዋታ ታሪክ"}</Text>
              <Text style={styles.subTitle}>{isEN ? "Analyze your performance and past matches" : "ያለፉትን ጨዋታዎችዎን እና አፈጻጸምዎን ይገምግሙ"}</Text>
            </View>

            <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
              <StatCard label={isEN ? "TOTAL GAMES" : "አጠቃላይ ጨዋታዎች"} value={String(summary.total)} icon="layers" color="#00daf3" isDesktop={isDesktop} />
              <StatCard label={isEN ? "WIN RATE" : "የድል መጠን"} value={`${summary.winRate}%`} icon="trending-up" color="#00daf3" isDesktop={isDesktop} />
              <StatCard label={isEN ? "WINS" : "ድሎች"} value={String(summary.wins)} icon="trophy" color="#4CAF50" isDesktop={isDesktop} />
              <StatCard label={isEN ? "LOSSES" : "ሽንፈቶች"} value={String(summary.losses)} icon="skull" color="#fd6f85" isDesktop={isDesktop} />
            </View>
          </View>
          
          <View style={[styles.contentLayout, isDesktop && styles.contentLayoutDesktop]}>
            <View style={{ flex: isDesktop ? 1.5 : 1 }}>
              {loading && !refreshing ? (
                <View style={{ gap: 12, paddingHorizontal: isDesktop ? 0 : 20 }}>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <View key={i} style={[styles.cardOuter, { marginHorizontal: 0, height: isDesktop ? 80 : 90, opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}>
                      {!isDesktop ? (
                        <View style={styles.card}>
                          <View style={styles.cardTopRow}>
                            <View style={{ width: 100, height: 26, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99 }} />
                            <View style={{ width: 60, height: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                          </View>
                          <View style={styles.cardBottomRow}>
                            <View style={{ width: 120, height: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                          </View>
                        </View>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                          <View style={{ width: 100, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginRight: 'auto' }} />
                          <View style={{ width: 80, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginHorizontal: 32 }} />
                          <View style={{ width: 80, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginHorizontal: 32 }} />
                          <View style={{ width: 120, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginHorizontal: 32 }} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : games.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="game-controller-outline" size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={styles.emptyText}>{isEN ? "No matches found" : "ምንም የተጫወቱት ጨዋታ የለም"}</Text>
                </View>
              ) : (
                <AnimatedList
                  items={games}
                  renderItem={(item: Game) => (
                    <MatchRow
                      item={item}
                      myId={myId}
                      router={router}
                      isDesktop={isDesktop}
                      onSelectGame={setSelectedGame}
                      isSelected={selectedGame?.id === item.id}
                    />
                  )}
                  style={{ flex: 1 }}
                  contentContainerStyle={isDesktop ? styles.listContentDesktop : styles.listContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#00daf3"
                      colors={["#00daf3"]}
                    />
                  }
                />
              )}
            </View>

            {isDesktop && (
              <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 40 }}>
                {selectedGame ? (
                  <SideReplayer
                    game={selectedGame}
                    myId={myId}
                    onClose={() => setSelectedGame(null)}
                  />
                ) : (
                  <View style={styles.placeholderCard}>
                    <LinearGradient colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']} style={StyleSheet.absoluteFillObject} />
                    <Ionicons name="game-controller-outline" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: 16 }} />
                    <Text style={styles.placeholderTitle}>SELECT A MATCH</Text>
                    <Text style={styles.placeholderDesc}>
                      Click the "DETAILS" button on any game record to view its interactive turn-by-turn replay in this pane.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  headerDesktop: { paddingHorizontal: 24, paddingVertical: 20 },
  titleRow: { marginBottom: 24 },
  mainTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  subTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4, fontWeight: '600' },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.15)',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backBtnText: { color: '#00daf3', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsGridDesktop: { flexWrap: 'nowrap', gap: 20 },
  
  statCard: { 
    flex: 1, 
    minWidth: '45%', 
    height: 90, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden'
  },
  statCardDesktop: { minWidth: 0, height: 100, paddingHorizontal: 20 },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 16 },
  statLabelText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statValueText: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  statGlow: { position: 'absolute', bottom: -20, right: -20, width: 60, height: 60, borderRadius: 30, opacity: 0.15 },

  contentLayout: { flex: 1 },
  contentLayoutDesktop: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 40 },

  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  listContentDesktop: { paddingHorizontal: 0, paddingBottom: 40 },

  // Desktop Match Card
  desktopMatchCard: {
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 16,
  },
  desktopMatchCardSelected: {
    borderColor: '#00daf3',
    backgroundColor: 'rgba(0, 218, 243, 0.03)',
  },
  statusIndicator: { width: 4, height: '100%' },
  desktopMatchMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  desktopStatusText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  desktopMatchId: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  
  desktopMatchInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  infoGroup: { alignItems: 'center' },
  infoLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 4 },
  infoDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' },

  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  detailsBtnText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.3 },

  // Mobile Card
  cardOuter: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 12, marginHorizontal: 20 },
  card: { padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  outcomePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  outcomeText: { fontWeight: '900', fontSize: 12 },
  betPill: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  betText: { color: '#FDE047', fontWeight: '900', fontSize: 13 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },

  empty: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },

  headerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.15)',
    alignSelf: 'flex-start',
  },
  headerRefreshText: { color: '#00daf3', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  // Replayer Panel styles
  replayerContainer: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    minHeight: 520,
  },
  replayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  replayerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  replayerSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  replayerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  replayerPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    zIndex: 10,
  },
  replayerPlayerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(253, 111, 133, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  replayerPlayerText: {
    color: '#fd6f85',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  replayerVs: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  replayerRounds: {
    marginBottom: 16,
    zIndex: 10,
  },
  roundTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  roundTabActive: {
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    borderColor: '#00daf3',
  },
  roundTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roundTabTextActive: {
    color: '#00daf3',
  },
  replayerBoard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    zIndex: 10,
  },
  replayerCell: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayerCellActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: '#00daf3',
    borderWidth: 1.5,
  },
  replayerStats: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
    zIndex: 10,
  },
  replayerProgressText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  replayerWinnerStatus: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  replayerDrawStatus: {
    color: '#ffb84d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  replayerLiveStatus: {
    color: '#00daf3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  replayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  replayerControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  replayerPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00daf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00daf3',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  // Placeholder Card
  placeholderCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#111115',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 520,
  },
  placeholderTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  placeholderDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
