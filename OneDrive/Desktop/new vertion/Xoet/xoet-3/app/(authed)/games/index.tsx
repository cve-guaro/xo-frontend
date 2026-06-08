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

// ---- Game helpers ----
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function roundChunks(moves: Move[]): Move[][] {
  const chunks: Move[][] = [];
  const safeMoves = moves || [];
  for (let i = 0; i < safeMoves.length; i += 9) {
    chunks.push(safeMoves.slice(i, i + 9));
  }
  return chunks;
}

function winnerForRound(moves: Move[], myId?: string | null): "win" | "loss" {
  const board = Array(9).fill("_");
  for (const m of moves) board[m.index] = m.symbol;

  const xWin = WIN_LINES.some((l) => l.every((i) => board[i] === "X"));
  const oWin = WIN_LINES.some((l) => l.every((i) => board[i] === "O"));
  if (!xWin && !oWin) return "loss"; // board full, no winner = fallback

  const last = moves[moves.length - 1];
  if (!myId) return "win";
  return last?.user === myId ? "win" : "loss";
}

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

const MatchRow = memo(({ item, myId, router, isDesktop }: { item: Game; myId: string | null; router: any; isDesktop: boolean }) => {
  // Use server-computed is_winner flag (most reliable)
  // Fall back to client-side comparison only if is_winner is not present (old API)
  const isWin = item.is_winner === true ||
    (item.is_winner === undefined && item.winner != null && String(item.winner).toLowerCase() === String(myId || '').toLowerCase());
  const isLoss = !isWin && item.winner != null;
  // Games with no winner are abandoned — show as loss since bet was cut
  const statusColor = isWin ? "#00daf3" : "#fd6f85";
  const statusLabel = isWin ? "VICTORY" : "DEFEAT";

  if (isDesktop) {
    return (
      <View style={styles.desktopMatchCard}>
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

          <TouchableOpacity 
            onPress={() => router.push({ pathname: "/(authed)/games/[id]", params: { id: item.id, bet: String(item.bet_amount), created_at: item.created_at, moves: encodeURIComponent(JSON.stringify(item.moves || [])), p1: Array.isArray(item.players) ? item.players[0] : String(item.players), p2: Array.isArray(item.players) ? item.players[1] : "", px_name: item.px_name || item.px_num || "", po_name: item.po_name || item.po_num || "" } } as any)}
            style={styles.detailsBtn}
          >
            <Text style={styles.detailsBtnText}>DETAILS</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mobile View
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/(authed)/games/[id]", params: { id: item.id, bet: String(item.bet_amount), created_at: item.created_at, moves: encodeURIComponent(JSON.stringify(item.moves || [])), p1: Array.isArray(item.players) ? item.players[0] : String(item.players), p2: Array.isArray(item.players) ? item.players[1] : "", px_name: item.px_name || item.px_num || "", po_name: item.po_name || item.po_num || "" } } as any)}
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

export default function GamesHistory() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user, token, language } = useAuth();
  const myId = user?.id ?? null;
  const isEN = language === "en";

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);

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
      setGames(Array.isArray(data?.history) ? data.history : []);
    } catch (e: any) {
      setError(e?.message || "Could not fetch history");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const summary = useMemo(() => {
    const wins = user?.total_wins || 0;
    const totalCount = user?.total_games || 0;
    const losses = totalCount - wins;
    // For total won, we can approximate based on wins * (avg bet) or keep it 0 if not tracked.
    // To keep it simple, we just use the API provided `user.total_wins`
    return { wins, losses, total: totalCount, winRate: totalCount ? Math.round((wins / totalCount) * 100) : 0, totalWon: 0 };
  }, [user]);

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <LinearGradient colors={["#0c0c1f", "#070714"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
          <StatusBar barStyle="light-content" />
          
          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={18} color="#00daf3" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.mainTitle}>Match History</Text>
              <Text style={styles.subTitle}>Analyze your performance and past matches</Text>
            </View>

            <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
              <StatCard label="TOTAL GAMES" value={String(summary.total)} icon="layers" color="#00daf3" isDesktop={isDesktop} />
              <StatCard label="WIN RATE" value={`${summary.winRate}%`} icon="trending-up" color="#00daf3" isDesktop={isDesktop} />
              <StatCard label="WINS" value={String(summary.wins)} icon="trophy" color="#4CAF50" isDesktop={isDesktop} />
              <StatCard label="LOSSES" value={String(summary.losses)} icon="skull" color="#fd6f85" isDesktop={isDesktop} />
            </View>
          </View>
          
          <View style={{ flex: 1 }}>
            <AnimatedList
              items={games}
              renderItem={(item: Game) => <MatchRow item={item} myId={myId} router={router} isDesktop={isDesktop} />}
              className="match-history-list"
            />
          </View>
          {loading && <ActivityIndicator color="#00daf3" style={{ marginTop: 20 }} />}
          {!loading && games.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="game-controller-outline" size={48} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>{isEN ? "No matches found" : "ምንም የተጫወቱት ጨዋታ የለም"}</Text>
            </View>
          )}
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

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listContentDesktop: { paddingHorizontal: 24 },

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
  cardOuter: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },
  card: { padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  outcomePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  outcomeText: { fontWeight: '900', fontSize: 12 },
  betPill: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  betText: { color: '#FDE047', fontWeight: '900', fontSize: 13 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },

  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
});
