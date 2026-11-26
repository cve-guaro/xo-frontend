// app/(authed)/home/transactions.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState, memo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../../config";
import { useAuth } from "../../../context/authContext";
import { useToast } from "../../../context/ToastContext";
import { SyncIcon } from "../../../components/SvgIcons";
import AnimatedList from "../../../components/AnimatedList";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import ProfileEditModal from "../../../components/ProfileEditModal";
import DesktopHeader from "../../../components/game/DesktopHeader";
import DesktopSidebar from "../../../components/game/DesktopSidebar";
import DesktopPageShell from "../../../components/game/DesktopPageShell";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import ReferralModal from "../../../components/ReferralModal";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import NotificationsPopover from "../../../components/NotificationsPopover";
import { TransactionDetailModal } from "../../../components/transactions/TransactionDetailModal";
import { BonusTrackingLogModal } from "../../../components/transactions/BonusTrackingLogModal";
import { downloadProfessionalReceipt } from "../../../lib/receiptGenerator";
import { haptics } from "../../../lib/haptcs";
import { playTickSound } from "../../../lib/pinTickAudio";

type Transaction = {
  id: string;
  type: "deposit" | "withdrawal" | "prize" | "DEPOSIT" | "WITHDRAW_REQUEST" | "PRIZE";
  amount: number;
  status: "success" | "pending" | "failed" | "PENDING" | "COMPLETED" | "SUCCESS" | "FAILED";
  method: string;
  ref: string;
  bank?: string;
  createdAt: string;
  tx_type?: string;
  tx_id?: string;
};

type GameActivityItem = {
  id: string;
  gameType: "xo" | "spin" | "rps" | "prize" | "bonus";
  title: string;
  subtitle: string;
  amount: number;
  netDelta: number;
  isWin: boolean;
  timestamp: number;
  created_at: string;
  categoryShare?: number;
};

// ---------------- Helpers ----------------
function formatDate(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function formatDateOnly(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatTimeOnly(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatRelativeTime(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function normalizeType(tx: Transaction): "deposit" | "withdrawal" | "prize" {
  if (!tx) return "deposit";
  const t = (tx.tx_type || tx.type || "").toString().toLowerCase();
  if (t === "deposit" || t === "deposit_success" || t === "deposit_request") return "deposit";
  if (t === "withdrawal" || t.includes("withdraw")) return "withdrawal";
  if (t === "prize" || t.includes("reward") || t.includes("won") || t.includes("match_reward")) return "prize";
  return "deposit";
}

function normalizeStatus(tx: Transaction): "success" | "pending" | "failed" {
  if (!tx) return "pending";
  const s = (tx.status || "").toString().toLowerCase();
  if (s === "completed" || s === "success" || s === "succeeded" || s === "paid" || s === "settled") return "success";
  if (s === "failed" || s === "rejected" || s === "declined" || s === "error" || s === "failure") return "failed";
  return "pending";
}

// ---------------- Components ----------------
// ---------------- Transaction Row / Card Component (Mobile Only) ----------------
const TransactionItem = memo(function TransactionItem({ 
  tx, 
  isEN,
  onPress,
  onDownload,
}: { 
  tx: Transaction; 
  isEN: boolean;
  onPress: () => void;
  onDownload: () => void;
}) {
  const type = normalizeType(tx);
  const status = normalizeStatus(tx);

  const isDeposit = type === "deposit";
  const isSuccess = status === "success";
  const isPending = status === "pending";

  const statusColor = isSuccess ? "#34d399" : isPending ? "#fbbf24" : "#f87171";
  const typeColor = isDeposit ? "#34d399" : type === "prize" ? "#00e5ff" : "#f87171";
  const typeIcon = isDeposit ? "arrow-down" : type === "prize" ? "gift" : "arrow-up";
  const typeBg = isDeposit
    ? "rgba(16,185,129,0.12)"
    : type === "prize"
    ? "rgba(0,229,255,0.12)"
    : "rgba(239,68,68,0.12)";

  const txDate = tx?.createdAt || (tx as any)?.created_at || "";
  const txRef = tx?.ref || tx?.tx_id || tx?.id || "";
  const safeRef = String(txRef || "");

  return (
    <TouchableOpacity style={styles.txCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={isDeposit ? ["rgba(16,185,129,0.07)", "rgba(16,185,129,0.01)"] : ["rgba(239,68,68,0.07)", "rgba(239,68,68,0.01)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.txIcon, { backgroundColor: typeBg }]}>
        <Ionicons name={typeIcon as any} size={18} color={typeColor} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.txTopRow}>
          <Text style={styles.txType} numberOfLines={1}>
            {isDeposit ? (isEN ? "Deposit" : "ተቀማጭ") : type === "prize" ? (isEN ? "Prize" : "ሽልማት") : (isEN ? "Withdrawal" : "ወጪ")}
          </Text>
          <Text style={[styles.txAmount, { color: typeColor }]}>
            {isDeposit || type === "prize" ? "+" : "-"}ETB{" "}
            {Number(tx?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.txMidRow}>
          <Text style={styles.txMethod} numberOfLines={1}>
            {(tx?.method || "Chapa").toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {isSuccess ? (isEN ? "Success" : "ተሳክቷል") : isPending ? (isEN ? "Pending" : "በመጠባበቅ ላይ") : (isEN ? "Failed" : "አልተሳካም")}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={13} color="#e5e3ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reference & Date */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
          {!!safeRef && (
            <Text style={styles.txRef} numberOfLines={1}>
              {isEN ? "Ref: " : "ማጣቀሻ: "}{safeRef.slice(0, 16)}{safeRef.length > 16 ? "..." : ""}
            </Text>
          )}
          <Text style={styles.txDate}>{txDate ? formatDate(txDate) : "—"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Mobile Transaction Item (Matching Phone 3 in reference mockup)
const MobileTxRow = memo(function MobileTxRow({
  tx,
  isEN,
  onPress,
}: {
  tx: Transaction;
  isEN: boolean;
  onPress: () => void;
}) {
  const type = normalizeType(tx);
  const isDeposit = type === "deposit";
  const isPrize = type === "prize" || (tx as any)?.tx_type === "SPIN_WIN" || String(tx?.method || "").toLowerCase().includes("spin");
  const isBet = (tx as any)?.tx_type === "GAME_BET" || (tx as any)?.tx_type === "BET" || String(tx?.method || "").toLowerCase().includes("bet");

  let iconName: keyof typeof Ionicons.glyphMap = "arrow-down";
  let iconBg = "rgba(16, 185, 129, 0.16)";
  let iconColor = "#10b981";
  let title = isEN ? "Deposit" : "ተቀማጭ";
  let amountPrefix = "+";
  let amountColor = "#10b981";

  if (isPrize) {
    iconName = "swap-horizontal";
    iconBg = "rgba(0, 218, 243, 0.16)";
    iconColor = "#00daf3";
    title = isEN ? "Spin Win" : "ስፒን አሸናፊ";
    amountPrefix = "+";
    amountColor = "#10b981";
  } else if (isBet) {
    iconName = "game-controller";
    iconBg = "rgba(168, 85, 247, 0.16)";
    iconColor = "#a855f7";
    title = isEN ? "Game Bet" : "የጨዋታ ውርርድ";
    amountPrefix = "-";
    amountColor = "#ef4444";
  } else if (!isDeposit) {
    iconName = "arrow-up";
    iconBg = "rgba(239, 68, 68, 0.16)";
    iconColor = "#ef4444";
    title = isEN ? "Withdrawal" : "ወጪ";
    amountPrefix = "-";
    amountColor = "#ef4444";
  }

  const txDate = tx?.createdAt || (tx as any)?.created_at || "";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View>
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
            {title}
          </Text>
          <Text style={{ color: "#8b93a7", fontSize: 11.5, fontWeight: "600", marginTop: 3 }}>
            {txDate ? formatDate(txDate) : "—"}
          </Text>
        </View>
      </View>

      <Text style={{ color: amountColor, fontSize: 15, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
        {amountPrefix}{Number(tx?.amount || 0).toLocaleString()} ETB
      </Text>
    </TouchableOpacity>
  );
});

// Skeleton Loader component for transactions loading state
function SkeletonTransactionLoader() {
  const pulseAnim = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={{ gap: 10, paddingTop: 4 }}>
      {[1, 2, 3, 4, 5].map((_, i) => (
        <Animated.View
          key={i}
          style={{
            backgroundColor: "#111625",
            borderRadius: 18,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.05)",
            opacity: pulseAnim,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e263d" }} />
            <View style={{ gap: 7 }}>
              <View style={{ width: 110, height: 14, backgroundColor: "#1e263d", borderRadius: 4 }} />
              <View style={{ width: 140, height: 10, backgroundColor: "#192033", borderRadius: 4 }} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={{ width: 75, height: 15, backgroundColor: "#1e263d", borderRadius: 4 }} />
            <View style={{ width: 55, height: 10, backgroundColor: "#192033", borderRadius: 4 }} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

// ---------------- Main Screen Component ----------------
export default function TransactionsScreen() {
  const router = useRouter();
  const { user, token, language, refreshProfile, switchLanguage, showAlert } = useAuth();
  const toast = useToast();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1024 && isWeb;
  const isTablet = width >= 768 && width < 1024 && isWeb;

  const walletSpinAnim = useRef(new Animated.Value(0)).current;
  const walletSpinDeg = walletSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal" | "prize">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusLogs, setBonusLogs] = useState<any[]>([]);
  const [gameActivities, setGameActivities] = useState<GameActivityItem[]>([]);

  // Navigation and utility states
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Selected Detail Transaction State
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // 3-dots popup options menu state
  const [openMenuTxId, setOpenMenuTxId] = useState<string | null>(null);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);

  // Pagination state (5 items per page on mobile)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchTxs = useCallback(async () => {
    try {
      const [txRes, bonusRes, xoRes, spinRes, rpsRes] = await Promise.all([
        fetch(`${API_URL}/account/transactions?t=${Date.now()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-platform": isWeb ? "web" : "mobile",
          },
        }),
        fetch(`${API_URL}/account/bonus-logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-platform": isWeb ? "web" : "mobile",
          },
        }).catch(() => ({ ok: false, status: 0, json: async () => ({ logs: [] }) } as any)),
        fetch(`${API_URL}/account/history`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 40 }),
        }).catch(() => ({ ok: false, status: 0, json: async () => ({ history: [] }) } as any)),
        fetch(`${API_URL}/spin/history?limit=30`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false, status: 0, json: async () => ({ history: [] }) } as any)),
        fetch(`${API_URL}/rps/history?limit=30`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ ok: false, status: 0, json: async () => ({ matches: [] }) } as any)),
      ]);
      
      const parsedActivities: GameActivityItem[] = [];

      if (txRes.ok) {
        const data = await txRes.json().catch(() => ({}));
        if (data?.ok && Array.isArray(data.transactions)) {
          setTxs(data.transactions);
          data.transactions.forEach((t: any) => {
            if (normalizeType(t) === "prize") {
              const isSpin = (t.method || "").toLowerCase().includes("spin") || t.game_type === "SPIN";
              parsedActivities.push({
                id: `tx_${t.id || t.ref || Math.random()}`,
                gameType: isSpin ? "spin" : "xo",
                title: isSpin ? "Spin Wheel Prize" : "XO Match Prize",
                subtitle: t.method ? `${t.method} · ${formatDateOnly(t.createdAt)}` : formatDateOnly(t.createdAt),
                amount: Number(t.amount) || 0,
                netDelta: Number(t.amount) || 0,
                isWin: true,
                timestamp: new Date(t.createdAt).getTime() || 0,
                created_at: t.createdAt,
              });
            }
          });
        }
      }
      
      if (bonusRes.ok) {
        try {
          const bonusData = await bonusRes.json();
          if (Array.isArray(bonusData.logs)) {
            setBonusLogs(bonusData.logs);
            bonusData.logs.forEach((b: any) => {
              parsedActivities.push({
                id: `bonus_${b.id}`,
                gameType: "bonus",
                title: b.bonus_type === "WELCOME" ? "Welcome Bonus" : "Bonus Reward",
                subtitle: formatDateOnly(b.created_at),
                amount: Number(b.amount) || 0,
                netDelta: Number(b.amount) || 0,
                isWin: true,
                timestamp: new Date(b.created_at).getTime() || 0,
                created_at: b.created_at,
              });
            });
          }
        } catch {}
      }

      if (xoRes?.ok) {
        try {
          const xoData = await xoRes.json();
          if (Array.isArray(xoData?.history)) {
            xoData.history.forEach((g: any) => {
              const isWin = g.is_winner === true || (g.winner != null && String(g.winner).toLowerCase() === String(user?.id || '').toLowerCase());
              const stake = Number(g.bet_amount || 0);
              const prize = isWin ? Math.round(stake * 1.6) : 0;
              const net = isWin ? (prize - stake) : -stake;
              const opponentName = isWin ? (g.po_name || 'Opponent') : (g.px_name || 'Opponent');

              parsedActivities.push({
                id: `xo_${g.id}`,
                gameType: 'xo',
                title: isWin ? 'XO Battle Victory' : 'XO Battle Match',
                subtitle: `vs @${opponentName} · ${formatDateOnly(g.created_at)}`,
                amount: isWin ? prize : stake,
                netDelta: net,
                isWin,
                timestamp: new Date(g.created_at).getTime() || 0,
                created_at: g.created_at,
              });
            });
          }
        } catch {}
      }

      if (spinRes?.ok) {
        try {
          const spinData = await spinRes.json();
          if (Array.isArray(spinData?.history)) {
            spinData.history.forEach((s: any) => {
              const isWin = Boolean(s.is_winner || (s.winner_user_id && String(s.winner_user_id).toLowerCase() === String(user?.id || '').toLowerCase()));
              const stake = Number(s.bet_amount || s.user_bet || 100);
              const prize = Number(s.prize_amount || 0);
              const net = isWin ? (prize - stake) : -stake;

              parsedActivities.push({
                id: `spin_${s.id}`,
                gameType: 'spin',
                title: isWin ? 'Spin Wheel Win' : 'Spin Wheel Round',
                subtitle: `${s.mode_label || 'Rail Spin'} · ${formatDateOnly(s.created_at)}`,
                amount: isWin ? prize : stake,
                netDelta: net,
                isWin,
                timestamp: new Date(s.created_at).getTime() || 0,
                created_at: s.created_at,
              });
            });
          }
        } catch {}
      }

      if (rpsRes?.ok) {
        try {
          const rpsData = await rpsRes.json();
          if (Array.isArray(rpsData?.matches)) {
            rpsData.matches.forEach((m: any) => {
              const isWin = String(m.winnerId) === String(user?.id);
              const stake = Number(m.betAmount || 0);
              const prize = Number(m.prizeAmount || 0);
              const net = isWin ? (prize - stake) : -stake;

              parsedActivities.push({
                id: `rps_${m.id}`,
                gameType: 'rps',
                title: isWin ? 'RPS Victory' : 'RPS Match',
                subtitle: `vs @${m.opponentName || 'Opponent'} · ${formatDateOnly(m.createdAt)}`,
                amount: isWin ? prize : stake,
                netDelta: net,
                isWin,
                timestamp: new Date(m.createdAt).getTime() || 0,
                created_at: m.createdAt,
              });
            });
          }
        } catch {}
      }

      // Deduplicate by ID and sort descending
      const seen = new Set<string>();
      const deduped: GameActivityItem[] = [];
      parsedActivities.sort((a, b) => b.timestamp - a.timestamp);
      for (const act of parsedActivities) {
        if (!seen.has(act.id)) {
          seen.add(act.id);
          deduped.push(act);
        }
      }

      const winSum = deduped.filter(a => a.isWin).reduce((acc, a) => acc + a.amount, 0);
      const finalActs = deduped.map(a => ({
        ...a,
        categoryShare: winSum > 0 && a.isWin ? Math.round((a.amount / winSum) * 100) : undefined,
      }));

      setGameActivities(finalActs);
    } catch (e) {
      console.error("[transactions] fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isWeb, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchTxs();
    }, [fetchTxs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTxs();
  }, [fetchTxs]);

  const handleRefreshWallet = useCallback(async () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    Animated.timing(walletSpinAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => walletSpinAnim.setValue(0));

    try {
      await Promise.all([
        refreshProfile?.(true),
        fetchTxs(),
      ]);
      toast.success(isEN ? "Balance Updated" : "ሂሳብዎ ታድሷል", undefined, 1500);
    } catch {
      toast.error(isEN ? "Refresh Failed" : "ማደስ አልተቻለም");
    }
  }, [refreshProfile, fetchTxs, isEN, toast, walletSpinAnim]);

  // Filter and search logic
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => {
      const type = normalizeType(t);
      const status = normalizeStatus(t);

      const matchesType = typeFilter === "all" ? true : type === typeFilter;
      if (!matchesType) return false;

      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      if (!matchesStatus) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const ref = String(t.ref || t.tx_id || t.id || "").toLowerCase();
        const method = String(t.method || "").toLowerCase();
        return ref.includes(query) || method.includes(query);
      }
      return true;
    });
  }, [txs, typeFilter, statusFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);
  const paginatedTxs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTxs.slice(start, start + itemsPerPage);
  }, [filteredTxs, currentPage]);

  const stats = useMemo(() => {
    let successCount = 0;
    let depCount = 0;
    let witCount = 0;
    let prizeCount = 0;

    let depSum = 0;
    let witSum = 0;
    let prizeSum = 0;

    txs.forEach((t) => {
      const s = normalizeStatus(t);
      if (s !== "success") return;
      successCount++;
      const type = normalizeType(t);
      if (type === "deposit") {
        depSum += Number(t.amount) || 0;
        depCount++;
      } else if (type === "withdrawal") {
        witSum += Number(t.amount) || 0;
        witCount++;
      } else if (type === "prize") {
        prizeSum += Number(t.amount) || 0;
        prizeCount++;
      }
    });

    const netFlow = depSum + prizeSum - witSum;
    return { 
      netFlow, 
      successCount,
      depCount, 
      witCount, 
      prizeCount 
    };
  }, [txs]);

  // Download Receipt helper
  const handleDownloadReceipt = (tx: Transaction) => {
    const type = normalizeType(tx);
    const status = normalizeStatus(tx);
    const date = formatDate(tx.createdAt || (tx as any).created_at || "");
    const amtStr = `${type === "deposit" || type === "prize" ? "+" : "-"}ETB ${Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const receiptContent = `
========================================
           XO ETHIOPIA RECEIPT          
========================================
Transaction ID  : ${tx.id}
Reference ID    : ${tx.ref || '—'}
Date & Time     : ${date}
Type            : ${type.toUpperCase()}
Amount          : ${amtStr}
Method          : ${(tx.method || "Chapa").toUpperCase()}
Status          : ${status.toUpperCase()}
========================================
      Thank you for playing with us!     
========================================
`.trim();

    if (Platform.OS === 'web') {
      try {
        downloadProfessionalReceipt({
          id: String(tx.id || ''),
          ref: tx.ref || undefined,
          type: type,
          amount: Number(tx.amount || 0),
          status: status,
          method: tx.method || (tx as any)?.payment_method || "Chapa",
          createdAt: tx.createdAt || (tx as any).created_at || new Date().toISOString(),
          userName: user?.username || (user as any)?.display_name,
          userPhone: user?.number || (user as any)?.phone,
        });
      } catch (e) {
        console.error("Canvas receipt download error:", e);
        const element = document.createElement("a");
        const file = new Blob([receiptContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `xoet_receipt_${tx.id}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    } else {
      showAlert(isEN ? "Receipt Details" : "የደረሰኝ ዝርዝር", receiptContent);
    }
  };

  const handleDownloadAllReceipts = () => {
    if (filteredTxs.length === 0) return;
    let content = `XO ETHIOPIA FINANCIAL ACTIVITIES EXPORT\nGenerated: ${new Date().toLocaleString()}\n\n`;
    content += `TYPE\tDETAILS\tAMOUNT\tSTATUS\tDATE\n`;
    filteredTxs.forEach(tx => {
      const type = normalizeType(tx).toUpperCase();
      const ref = tx.ref || tx.id;
      const amt = `${normalizeType(tx) === 'withdrawal' ? '-' : '+'}ETB ${tx.amount}`;
      const status = normalizeStatus(tx).toUpperCase();
      const date = formatDate(tx.createdAt);
      content += `${type}\t${tx.method || 'Chapa'} (${ref})\t${amt}\t${status}\t${date}\n`;
    });

    if (Platform.OS === 'web') {
      const element = document.createElement("a");
      const file = new Blob([content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `xoet_transactions_export.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      showAlert("Export success", "All visible transaction data ready for download.");
    }
  };

  const handleLanguageToggle = useCallback(() => {
    switchLanguage();
  }, [switchLanguage]);

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

  const renderTx = useCallback((item: Transaction) => (
    <TransactionItem 
      tx={item} 
      isEN={isEN} 
      onPress={() => setSelectedDetailTx(item)}
      onDownload={() => handleDownloadReceipt(item)}
    />
  ), [isEN]);

  // Render pagination buttons exactly like the screenshot
  const renderPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return (
      <View style={s.paginationWrap}>
        <Text style={s.paginationInfo}>
          Showing {filteredTxs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTxs.length)} of {filteredTxs.length} transactions
        </Text>
        <View style={s.paginationControls}>
          <TouchableOpacity 
            style={[s.pageArrowBtn, currentPage === 1 && s.pageBtnDisabled]} 
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? "rgba(255,255,255,0.2)" : "#fff"} />
          </TouchableOpacity>
          {pages.map((p, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[
                s.pageNumberBtn, 
                currentPage === p && s.pageNumberBtnActive,
                p === '...' && { backgroundColor: 'transparent', borderWidth: 0 }
              ]}
              disabled={p === '...'}
              onPress={() => setCurrentPage(Number(p))}
            >
              <Text style={[s.pageNumberText, currentPage === p && s.pageNumberTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[s.pageArrowBtn, currentPage === totalPages && s.pageBtnDisabled]} 
            disabled={currentPage === totalPages || totalPages === 0}
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={14} color={currentPage === totalPages || totalPages === 0 ? "rgba(255,255,255,0.2)" : "#fff"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Desktop Banking & Activities Helpers ───
  const bankingCounts = useMemo(() => {
    let all = 0;
    let deposit = 0;
    let withdrawal = 0;
    txs.forEach((t) => {
      const type = normalizeType(t);
      if (type === "deposit") {
        all++;
        deposit++;
      } else if (type === "withdrawal") {
        all++;
        withdrawal++;
      }
    });
    return { all, deposit, withdrawal };
  }, [txs]);

  const bankingTxs = useMemo(() => {
    return txs.filter((t) => {
      const type = normalizeType(t);
      if (type !== "deposit" && type !== "withdrawal") return false;

      if (typeFilter === "deposit" && type !== "deposit") return false;
      if (typeFilter === "withdrawal" && type !== "withdrawal") return false;

      const status = normalizeStatus(t);
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const ref = String(t.ref || t.tx_id || t.id || "").toLowerCase();
        const method = String(t.method || "").toLowerCase();
        const bank = String(t.bank || "").toLowerCase();
        return ref.includes(query) || method.includes(query) || bank.includes(query);
      }
      return true;
    });
  }, [txs, typeFilter, statusFilter, searchQuery]);

  const desktopBankingPerPage = 7;
  const totalBankingPages = Math.max(1, Math.ceil(bankingTxs.length / desktopBankingPerPage));
  const paginatedBankingTxs = useMemo(() => {
    const start = (currentPage - 1) * desktopBankingPerPage;
    return bankingTxs.slice(start, start + desktopBankingPerPage);
  }, [bankingTxs, currentPage, desktopBankingPerPage]);

  const totalActivitiesPrize = useMemo(() => {
    return gameActivities
      .filter((a) => a.isWin)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [gameActivities]);

  const renderBankingPagination = () => {
    if (totalBankingPages <= 1) return null;

    const pages: (number | string)[] = [];
    if (totalBankingPages <= 5) {
      for (let i = 1; i <= totalBankingPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalBankingPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalBankingPages - 2) pages.push("...");
      pages.push(totalBankingPages);
    }

    return (
      <View style={s.paginationWrap}>
        <Text style={s.paginationInfo}>
          Showing {bankingTxs.length === 0 ? 0 : (currentPage - 1) * desktopBankingPerPage + 1} to {Math.min(currentPage * desktopBankingPerPage, bankingTxs.length)} of {bankingTxs.length} payments
        </Text>
        <View style={s.paginationControls}>
          <TouchableOpacity 
            style={[s.pageArrowBtn, currentPage === 1 && s.pageBtnDisabled]} 
            disabled={currentPage === 1}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? "rgba(255,255,255,0.2)" : "#fff"} />
          </TouchableOpacity>
          {pages.map((p, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[
                s.pageNumberBtn, 
                currentPage === p && s.pageNumberBtnActive,
                p === '...' && { backgroundColor: 'transparent', borderWidth: 0 }
              ]}
              disabled={p === '...'}
              onPress={() => setCurrentPage(Number(p))}
            >
              <Text style={[s.pageNumberText, currentPage === p && s.pageNumberTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={[s.pageArrowBtn, currentPage === totalBankingPages && s.pageBtnDisabled]} 
            disabled={currentPage === totalBankingPages || totalBankingPages === 0}
            onPress={() => setCurrentPage(p => Math.min(totalBankingPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={14} color={currentPage === totalBankingPages || totalBankingPages === 0 ? "rgba(255,255,255,0.2)" : "#fff"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? ["bottom"] : ["top", "left", "right", "bottom"]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0e1a" }]} />

      {/* ─── MODALS ─── */}
      <BonusTrackingLogModal 
        visible={bonusModalVisible} 
        onClose={() => setBonusModalVisible(false)}
        bonusLogs={bonusLogs}
        token={token}
        fetchTxs={fetchTxs}
      />
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
      <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

      {/* Transaction Details Modal (Image 3 bottom-to-top spring sheet) */}
      <TransactionDetailModal
        tx={selectedDetailTx}
        visible={!!selectedDetailTx}
        onClose={() => setSelectedDetailTx(null)}
        isEN={isEN}
        onDownloadReceipt={handleDownloadReceipt}
      />

      {isDesktop ? (
        /* ────────── PREMIUM UNIFIED DESKTOP SHELL ────────── */
        <DesktopPageShell
          currentScreen="transactions"
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
          {/* Main Scroll Content */}
          <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.pageContentWrapper}>
              {/* 2-COLUMN CLASSIFICATION MATCHING INSPIRATION SPEC */}
              <View style={s.twoColumnLayout}>
                {/* ────────── LEFT COLUMN: Wallet Card + 2 Buttons + Activities ────────── */}
                <View style={s.leftColumn}>
                  {/* 1. Clean Wallet Balance Card (Balance + Eye Toggle + Refresh ONLY) */}
                  <View style={s.cardWrapper}>
                    <LinearGradient
                      colors={["#10192d", "#090e1a", "#060911"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.walletBalanceCard}
                    >
                      {/* Top Row: Label + Eye Toggle & Refresh Buttons */}
                      <View style={s.cardTopRow}>
                        <View style={s.walletLabelRow}>
                          <View style={s.walletLabelDot} />
                          <Text style={s.cardBalanceLabel}>WALLET BALANCE</Text>
                        </View>
                        <View style={s.cardTopActions}>
                          <TouchableOpacity
                            onPress={() => {
                              try { playTickSound(); } catch {}
                              haptics.tap();
                              setIsBalanceHidden(!isBalanceHidden);
                            }}
                            style={s.cardActionBtn}
                            activeOpacity={0.7}
                            accessibilityLabel="Toggle balance visibility"
                          >
                            <Ionicons name={isBalanceHidden ? "eye-off-outline" : "eye-outline"} size={16} color="#00DAF3" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleRefreshWallet}
                            style={s.cardActionBtn}
                            activeOpacity={0.7}
                            accessibilityLabel="Refresh balance"
                          >
                            <Animated.View style={{ transform: [{ rotate: walletSpinDeg }] }}>
                              <Ionicons name="refresh" size={16} color="#00DAF3" />
                            </Animated.View>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Main Real Balance Amount */}
                      <View style={s.walletAmountRow}>
                        <Text style={s.walletCurrencyTag}>ETB</Text>
                        <Text style={s.cardBalanceValue}>
                          {isBalanceHidden
                            ? "••••••"
                            : Number(user?.available_balance || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* 2. Fast Transfer (Deposit & Withdraw Buttons) */}
                  <View style={s.fastActionsSection}>
                    <Text style={s.sectionHeaderTitle}>Fast transfer</Text>
                    <View style={s.fastActionsRow}>
                      {/* Deposit Button */}
                      <TouchableOpacity
                        onPress={() => {
                          try { playTickSound(); } catch {}
                          haptics.tap();
                          setDepositVisible(true);
                        }}
                        style={[s.actionButtonCard, { borderColor: "rgba(16, 185, 129, 0.25)" }]}
                        activeOpacity={0.8}
                      >
                        <View style={[s.actionIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                          <Ionicons name="arrow-down" size={18} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.actionBtnTitle}>Deposit</Text>
                          <Text style={[s.actionBtnSubtitle, { color: "#10B981" }]}>Add funds</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Withdraw Button */}
                      <TouchableOpacity
                        onPress={() => {
                          try { playTickSound(); } catch {}
                          haptics.tap();
                          setWithdrawVisible(true);
                        }}
                        style={[s.actionButtonCard, { borderColor: "rgba(0, 218, 243, 0.25)" }]}
                        activeOpacity={0.8}
                      >
                        <View style={[s.actionIconWrap, { backgroundColor: "rgba(0, 218, 243, 0.15)" }]}>
                          <Ionicons name="arrow-up" size={18} color="#00DAF3" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.actionBtnTitle}>Withdraw</Text>
                          <Text style={[s.actionBtnSubtitle, { color: "#00DAF3" }]}>Cash out</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3. Activities Section (Game Prizes & Losses ONLY) */}
                  <View style={s.activitiesSection}>
                    <View style={s.activitiesHeaderRow}>
                      <Text style={s.sectionHeaderTitle}>Activities</Text>
                      <Text style={s.activitiesTotalSum}>
                        +ETB {totalActivitiesPrize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={s.activitiesCard}>
                      {gameActivities.length === 0 ? (
                        <View style={s.emptyActivitiesBox}>
                          <Ionicons name="trophy-outline" size={28} color="rgba(255,255,255,0.2)" />
                          <Text style={s.emptyActivitiesText}>No game prizes recorded yet.</Text>
                          <Text style={s.emptyActivitiesSub}>Play XO, Spin or RPS to win cash prizes!</Text>
                        </View>
                      ) : (
                        gameActivities.slice(0, 6).map((item) => {
                          const isWin = item.isWin;
                          let iconName: keyof typeof Ionicons.glyphMap = "trophy";
                          let iconColor = "#10B981";
                          let iconBg = "rgba(16, 185, 129, 0.12)";

                          if (item.gameType === "xo") {
                            iconName = "grid";
                            iconColor = "#00DAF3";
                            iconBg = "rgba(0, 218, 243, 0.12)";
                          } else if (item.gameType === "spin") {
                            iconName = "disc";
                            iconColor = "#F59E0B";
                            iconBg = "rgba(245, 158, 11, 0.12)";
                          } else if (item.gameType === "rps") {
                            iconName = "hand-right";
                            iconColor = "#A855F7";
                            iconBg = "rgba(168, 85, 247, 0.12)";
                          } else if (item.gameType === "bonus") {
                            iconName = "gift";
                            iconColor = "#10B981";
                            iconBg = "rgba(16, 185, 129, 0.12)";
                          }

                          return (
                            <View key={item.id} style={s.activityRow}>
                              <View style={[s.activityIconBox, { backgroundColor: iconBg }]}>
                                <Ionicons name={iconName} size={16} color={iconColor} />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={s.activityTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={s.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={[s.activityAmount, { color: isWin ? "#10B981" : "#F87171" }]}>
                                  {isWin ? "+" : "-"}ETB {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                                {item.categoryShare ? (
                                  <Text style={s.activityShare}>{item.categoryShare}%</Text>
                                ) : (
                                  <Text style={[s.activityOutcomeTag, { color: isWin ? "#10B981" : "#F87171" }]}>
                                    {isWin ? "WIN" : "LOSS"}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                </View>

                {/* ────────── RIGHT COLUMN: Payment History (Deposit & Withdrawal only) ────────── */}
                <View style={s.rightColumnBox}>
                  {/* Payment history Header & Search/Export */}
                  <View style={s.paymentHistoryHeader}>
                    <View>
                      <Text style={s.paymentHistoryTitle}>Payment history</Text>
                      <Text style={s.paymentHistorySub}>Deposit and withdrawal transactions</Text>
                    </View>

                    {/* Tools: Search + Export */}
                    <View style={s.historyToolsRow}>
                      <View style={s.historySearchBox}>
                        <Ionicons name="search" size={14} color="#8b93a7" />
                        <TextInput
                          style={s.historySearchInput}
                          placeholder="Search ref or method..."
                          placeholderTextColor="rgba(139,147,167,0.45)"
                          value={searchQuery}
                          onChangeText={(txt) => {
                            setSearchQuery(txt);
                            setCurrentPage(1);
                          }}
                        />
                        {!!searchQuery && (
                          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 2 }}>
                            <Ionicons name="close-circle" size={14} color="#8b93a7" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={handleDownloadAllReceipts}
                        style={s.exportPillBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="download-outline" size={14} color="#cbd5e1" />
                        <Text style={s.exportPillText}>Export</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Redesigned Unified Filtration Bar (Segmented Type Pills + Anchored Status Filter) */}
                  <View style={s.desktopFilterBar}>
                    {/* Segmented Type Filter Pills */}
                    <View style={s.segmentedFilterWrap}>
                      {([
                        { key: "all", label: "All", icon: "layers-outline", count: bankingCounts.all },
                        { key: "deposit", label: "Deposits", icon: "arrow-down-outline", count: bankingCounts.deposit },
                        { key: "withdrawal", label: "Withdrawals", icon: "arrow-up-outline", count: bankingCounts.withdrawal },
                      ] as const).map((tab) => {
                        const isActive = typeFilter === tab.key;
                        return (
                          <TouchableOpacity
                            key={tab.key}
                            onPress={() => {
                              try { playTickSound(); } catch {}
                              haptics.tap();
                              setTypeFilter(tab.key);
                              setCurrentPage(1);
                            }}
                            style={[s.segmentedFilterPill, isActive && s.segmentedFilterPillActive]}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={tab.icon}
                              size={13}
                              color={isActive ? "#00DAF3" : "#64748b"}
                            />
                            <Text style={[s.segmentedFilterText, isActive && s.segmentedFilterTextActive]}>
                              {tab.label}
                            </Text>
                            <View style={[s.segmentedCountBadge, isActive && s.segmentedCountBadgeActive]}>
                              <Text style={[s.segmentedCountText, isActive && s.segmentedCountTextActive]}>
                                {tab.count}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Right Side: Status Filter Pill + Anchored Popover + Reset */}
                    <View style={s.statusFilterAnchor}>
                      {(typeFilter !== "all" || statusFilter !== "all" || searchQuery.trim() !== "") && (
                        <TouchableOpacity
                          onPress={() => {
                            try { playTickSound(); } catch {}
                            haptics.tap();
                            setTypeFilter("all");
                            setStatusFilter("all");
                            setSearchQuery("");
                            setDesktopFilterOpen(false);
                            setCurrentPage(1);
                          }}
                          style={s.resetFilterChip}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={12} color="#94a3b8" />
                          <Text style={s.resetFilterText}>Reset</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => {
                          try { playTickSound(); } catch {}
                          haptics.tap();
                          setDesktopFilterOpen((v) => !v);
                        }}
                        style={[
                          s.statusDropdownTrigger,
                          (statusFilter !== "all" || desktopFilterOpen) && s.statusDropdownTriggerActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="options-outline"
                          size={14}
                          color={statusFilter !== "all" || desktopFilterOpen ? "#00DAF3" : "#94a3b8"}
                        />
                        <Text
                          style={[
                            s.statusDropdownText,
                            (statusFilter !== "all" || desktopFilterOpen) && { color: "#00DAF3" },
                          ]}
                        >
                          {statusFilter === "all"
                            ? "All Statuses"
                            : statusFilter === "success"
                            ? "Completed"
                            : statusFilter === "pending"
                            ? "Pending"
                            : "Failed"}
                        </Text>
                        <Ionicons
                          name={desktopFilterOpen ? "chevron-up" : "chevron-down"}
                          size={13}
                          color={statusFilter !== "all" || desktopFilterOpen ? "#00DAF3" : "#64748b"}
                        />
                      </TouchableOpacity>

                      {desktopFilterOpen && (
                        <View style={s.statusDropdownMenu}>
                          {([
                            { key: "all", label: "All Statuses", dot: "#94a3b8" },
                            { key: "success", label: "Completed", dot: "#34d399" },
                            { key: "pending", label: "Pending", dot: "#fbbf24" },
                            { key: "failed", label: "Failed", dot: "#f87171" },
                          ] as const).map((opt) => {
                            const selected = statusFilter === opt.key;
                            return (
                              <TouchableOpacity
                                key={opt.key}
                                onPress={() => {
                                  try { playTickSound(); } catch {}
                                  haptics.tap();
                                  setStatusFilter(opt.key);
                                  setCurrentPage(1);
                                  setDesktopFilterOpen(false);
                                }}
                                style={[s.statusDropdownItem, selected && s.statusDropdownItemActive]}
                                activeOpacity={0.75}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <View style={[s.statusMenuDot, { backgroundColor: opt.dot }]} />
                                  <Text style={[s.statusDropdownItemText, selected && { color: "#fff" }]}>
                                    {opt.label}
                                  </Text>
                                </View>
                                {selected && <Ionicons name="checkmark" size={14} color="#00DAF3" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Payment List Card */}
                  <View style={s.paymentListCard}>
                    {loading ? (
                      <View style={{ paddingVertical: 80, alignItems: "center", justifyContent: "center" }}>
                        <ActivityIndicator size="large" color="#00e5ff" />
                      </View>
                    ) : paginatedBankingTxs.length === 0 ? (
                      <View style={{ paddingVertical: 70, alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <Ionicons name="receipt-outline" size={32} color="rgba(255,255,255,0.2)" />
                        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "700" }}>
                          No deposit or withdrawal records found
                        </Text>
                      </View>
                    ) : (
                      paginatedBankingTxs.map((item, idx) => {
                        const type = normalizeType(item);
                        const status = normalizeStatus(item);
                        const isDeposit = type === "deposit";
                        const isSuccess = status === "success";
                        const isPending = status === "pending";

                        const statusColor = isSuccess ? "#34d399" : isPending ? "#fbbf24" : "#f87171";
                        const typeColor = isDeposit ? "#34d399" : "#FFFFFF";
                        const typeIcon = isDeposit ? "arrow-down" : "arrow-up";
                        const typeIconBg = isDeposit ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)";
                        const typeIconColor = isDeposit ? "#10B981" : "#F87171";

                        return (
                          <TouchableOpacity
                            key={item.id || idx}
                            onPress={() => setSelectedDetailTx(item)}
                            activeOpacity={0.8}
                            style={[
                              s.paymentItemRow,
                              idx < paginatedBankingTxs.length - 1 && s.paymentItemBorder
                            ]}
                          >
                            {/* Icon */}
                            <View style={[s.paymentIconBox, { backgroundColor: typeIconBg }]}>
                              <Ionicons name={typeIcon as any} size={16} color={typeIconColor} />
                            </View>

                            {/* Method & Reference */}
                            <View style={{ flex: 1.5, minWidth: 110, paddingRight: 8 }}>
                              <Text style={s.paymentItemTitle} numberOfLines={1}>
                                {(item.method || "Chapa").toUpperCase()} {isDeposit ? "Deposit" : "Withdrawal"}
                              </Text>
                              <Text style={s.paymentItemRef} numberOfLines={1}>
                                Ref: {String(item.ref || item.id || "—").slice(0, 16)}
                              </Text>
                            </View>

                            {/* Date & Time */}
                            <View style={{ flex: 1, minWidth: 88, paddingRight: 8 }}>
                              <Text style={s.paymentItemDate} numberOfLines={1}>
                                {formatDateOnly(item.createdAt)}
                              </Text>
                              <Text style={s.paymentItemTime} numberOfLines={1}>
                                {formatTimeOnly(item.createdAt)}
                              </Text>
                            </View>

                            {/* Status Badge */}
                            <View style={{ minWidth: 94, flexShrink: 0, alignItems: "flex-start" }}>
                              <View style={[s.paymentStatusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
                                <View style={[s.paymentStatusDot, { backgroundColor: statusColor }]} />
                                <Text style={[s.paymentStatusText, { color: statusColor }]} numberOfLines={1}>
                                  {status.toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            {/* Amount */}
                            <View style={{ minWidth: 108, flexShrink: 0, alignItems: "flex-end" }}>
                              <Text style={[s.paymentItemAmount, { color: typeColor }]} numberOfLines={1}>
                                {isDeposit ? "+" : "-"}ETB {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </View>

                            {/* Action: Download receipt icon */}
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDownloadReceipt(item);
                              }}
                              style={s.paymentItemActionBtn}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="download-outline" size={13} color="#8b93a7" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })
                    )}

                    {/* Pagination */}
                    {renderBankingPagination()}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </DesktopPageShell>
      ) : (
        /* ────────── MOBILE PORTRAIT LAYOUT (XOET Dark Gaming Theme) ────────── */
        <View style={{ flex: 1, backgroundColor: "#07090e" }}>
          {/* ─── FIXED / PINNED TOP SECTION (Header, Balance, 2 Action Buttons, Filter Row) ─── */}
          <View style={{ paddingHorizontal: 16 }}>
            {/* 1. Header: Back Chevron + "Welcome back" + Language Switcher + Notifications Bell */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 12,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    router.push("/(authed)/home/gameplay");
                  }}
                  activeOpacity={0.75}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#121625",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color="#ffffff" />
                </TouchableOpacity>
                <Text style={{
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: "800",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: -0.2,
                }}>
                  {isEN ? "Welcome back" : "እንኳን ደህና መጡ"}
                </Text>
              </View>

              {/* Right: Language Selector + Notifications Bell (Beside notification as requested) */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={handleLanguageToggle}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    height: 38,
                    paddingHorizontal: 11,
                    borderRadius: 19,
                    backgroundColor: "#121625",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Ionicons name="globe-outline" size={15} color="#00daf3" />
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>
                    {language.toUpperCase()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setNotificationsVisible(true);
                  }}
                  activeOpacity={0.75}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#121625",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Ionicons name="notifications-outline" size={18} color="#ffffff" />
                  {unreadCount > 0 && (
                    <View style={{
                      position: "absolute",
                      top: 7,
                      right: 8,
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: "#ef4444",
                    }} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Account Balance Card (Dark Gaming Styling) */}
            <View style={{
              backgroundColor: "#111625",
              borderRadius: 22,
              padding: 18,
              borderWidth: 1.2,
              borderColor: "rgba(255, 255, 255, 0.08)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
              marginBottom: 14,
            }}>
              {/* Top Row: Label & Eye Icon */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{
                  color: "#8b93a7",
                  fontSize: 13,
                  fontWeight: "700",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {isEN ? "Wallet balance" : "የቦርሳ ቀሪ ሂሳብ"}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    try { playTickSound(); } catch {}
                    haptics.tap();
                    setIsBalanceHidden((prev) => !prev);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "rgba(255, 255, 255, 0.07)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={isBalanceHidden ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={isBalanceHidden ? "#ff2a5f" : "#cbd5e1"}
                  />
                </TouchableOpacity>
              </View>

              {/* Main Balance Row: Left-Aligned Big Balance + Refresh directly under eye */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{
                  color: "#ffffff",
                  fontSize: 32,
                  fontWeight: "900",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: -0.5,
                }}>
                  {isBalanceHidden
                    ? "••••••••"
                    : `ETB ${Math.floor(Number(user?.available_balance ?? 0)).toLocaleString()}`}
                </Text>

                {/* Refresh button directly under the eye (gray icon only matching eye toggle) */}
                <TouchableOpacity
                  onPress={handleRefreshWallet}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "rgba(255, 255, 255, 0.07)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel="Refresh Balance"
                >
                  <Animated.View style={{ transform: [{ rotate: walletSpinDeg }] }}>
                    <SyncIcon size={15} color="#cbd5e1" />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Account / Phone pill */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    const phoneOrId = user?.number || (user as any)?.phone || user?.id?.slice(0, 10) || "1289440585";
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(phoneOrId);
                    }
                    showAlert(isEN ? "Copied" : "ተገልብጧል", phoneOrId);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 3.5,
                    borderRadius: 10,
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <Ionicons name="copy-outline" size={12} color="#8b93a7" />
                  <Text style={{ color: "#8b93a7", fontSize: 11.5, fontWeight: "600" }}>
                    {user?.number || (user as any)?.phone || user?.id?.slice(0, 10) || "1289440585"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. ONLY 2 ACTION BUTTONS: [ Deposit ] and [ Withdrawal ] (Misleading buttons removed) */}
            <View style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 14,
            }}>
              {/* Deposit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  haptics.impact();
                  setDepositVisible(true);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: "#10b981",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: "#10b981",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#052e16" />
                <Text style={{ color: "#052e16", fontSize: 14.5, fontWeight: "900", letterSpacing: 0.3 }}>
                  {isEN ? "Deposit" : "ገንዘብ አስገባ"}
                </Text>
              </TouchableOpacity>

              {/* Withdrawal Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  haptics.impact();
                  setWithdrawVisible(true);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: "#161c2e",
                  borderWidth: 1.2,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="arrow-up-circle-outline" size={20} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 14.5, fontWeight: "800", letterSpacing: 0.3 }}>
                  {isEN ? "Withdrawal" : "ገንዘብ አውጣ"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. Transactions Title Row with Filter Dropdown Trigger */}
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              paddingHorizontal: 2,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{
                  color: "#ffffff",
                  fontSize: 17,
                  fontWeight: "900",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: -0.2,
                }}>
                  {isEN ? "Transactions" : "ግብይቶች"}
                </Text>
                <View style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}>
                  <Text style={{ color: "#8b93a7", fontSize: 11, fontWeight: "700" }}>
                    {filteredTxs.length}
                  </Text>
                </View>
              </View>

              {/* Filter Button / Active Filter Pill */}
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setShowFilterModal(true);
                }}
                activeOpacity={0.75}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: (typeFilter !== "all" || statusFilter !== "all") ? "rgba(0, 218, 243, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: (typeFilter !== "all" || statusFilter !== "all") ? "#00daf3" : "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Ionicons name="options-outline" size={14} color={(typeFilter !== "all" || statusFilter !== "all") ? "#00daf3" : "#8b93a7"} />
                <Text style={{
                  color: (typeFilter !== "all" || statusFilter !== "all") ? "#00daf3" : "#8b93a7",
                  fontSize: 12,
                  fontWeight: "700",
                }}>
                  {typeFilter === "all" && statusFilter === "all"
                    ? (isEN ? "Filter" : "አጣራ")
                    : `${typeFilter.toUpperCase()}${statusFilter !== "all" ? ` • ${statusFilter.toUpperCase()}` : ""}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── SCROLLABLE TRANSACTION LIST (Only this scrolls!) ─── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00daf3" colors={["#00daf3"]} />}
          >
            {loading ? (
              <SkeletonTransactionLoader />
            ) : filteredTxs.length === 0 ? (
              <View style={{
                backgroundColor: "#111625",
                borderRadius: 18,
                paddingVertical: 45,
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
                marginTop: 6,
              }}>
                <Ionicons name="receipt-outline" size={42} color="#2a334d" />
                <Text style={{ color: "#8b93a7", fontSize: 14, fontWeight: "600" }}>
                  {isEN ? "No transactions found" : "ምንም ግብይት አልተገኘም"}
                </Text>
              </View>
            ) : (
              filteredTxs.map((item) => {
                const type = normalizeType(item);
                const isDeposit = type === "deposit";
                const isPrize = type === "prize";
                const txDate = item.createdAt || (item as any)?.created_at || "";
                const status = normalizeStatus(item);

                const iconName = isDeposit ? "arrow-down" : isPrize ? "gift" : "arrow-up";
                const iconBg = isDeposit
                  ? "rgba(16, 185, 129, 0.16)"
                  : isPrize
                  ? "rgba(245, 182, 66, 0.16)"
                  : "rgba(255, 42, 95, 0.16)";
                const iconColor = isDeposit ? "#10b981" : isPrize ? "#f5b642" : "#ff2a5f";
                const amtPrefix = isDeposit || isPrize ? "+" : "-";
                const amtColor = isDeposit ? "#10b981" : isPrize ? "#f5b642" : "#ff2a5f";

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.82}
                    onPress={() => {
                      haptics.tap();
                      setSelectedDetailTx(item);
                    }}
                    style={{
                      backgroundColor: "#111625",
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.06)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: iconBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: "#ffffff",
                          fontSize: 14.5,
                          fontWeight: "800",
                          fontFamily: "Inter, sans-serif",
                        }} numberOfLines={1}>
                          {isDeposit
                            ? (isEN ? "Deposit" : "ተቀማጭ")
                            : isPrize
                            ? (isEN ? "Prize Reward" : "የስጦታ ሽልማት")
                            : (isEN ? "Withdrawal" : "ወጪ")}
                        </Text>
                        <Text style={{ color: "#8b93a7", fontSize: 11.5, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>
                          {isDeposit ? "Received" : "Sent by you"} • {txDate ? formatRelativeTime(txDate) || formatDateOnly(txDate) : "Recent"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{
                        color: amtColor,
                        fontSize: 15,
                        fontWeight: "900",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        {amtPrefix}ETB {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={{
                        color: status === "success" ? "#10b981" : status === "pending" ? "#f59e0b" : "#ef4444",
                        fontSize: 11,
                        fontWeight: "700",
                        marginTop: 2,
                        textTransform: "capitalize",
                      }}>
                        {status === "success" ? (isEN ? "Completed" : "ተጠናቅቋል") : status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Filter Modal Sheet (Universal: Centered Dialog on Desktop, Bottom Sheet on Mobile) */}
      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <View style={{
          flex: 1,
          justifyContent: isDesktop ? "center" : "flex-end",
          alignItems: isDesktop ? "center" : "stretch",
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          padding: isDesktop ? 20 : 0,
        }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowFilterModal(false)} />
          <View style={{
            backgroundColor: "#0f1424",
            borderRadius: isDesktop ? 24 : 28,
            borderBottomLeftRadius: isDesktop ? 24 : 0,
            borderBottomRightRadius: isDesktop ? 24 : 0,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
            paddingHorizontal: 22,
            paddingTop: 18,
            paddingBottom: isDesktop ? 24 : (Platform.OS === "ios" ? 38 : 24),
            width: isDesktop ? 480 : "100%",
            maxWidth: "100%",
            zIndex: 10,
          }}>
            {/* Filter Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
                {isEN ? "Filter Transactions" : "ግብይቶችን አጣራ"}
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#8b93a7" />
              </TouchableOpacity>
            </View>

            {/* Filter by Type */}
            <Text style={{ color: "#8b93a7", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {isEN ? "Transaction Type" : "የግብይት ዓይነት"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {[
                { key: "all", label: isEN ? "All Types" : "ሁሉንም" },
                { key: "deposit", label: isEN ? "Deposit" : "ተቀማጭ" },
                { key: "withdrawal", label: isEN ? "Withdrawal" : "ወጪ" },
                { key: "prize", label: isEN ? "Prize / Win" : "ሽልማት" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    haptics.tap();
                    setTypeFilter(opt.key as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: typeFilter === opt.key ? "rgba(0, 218, 243, 0.18)" : "#161c2e",
                    borderWidth: 1,
                    borderColor: typeFilter === opt.key ? "#00daf3" : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Text style={{ color: typeFilter === opt.key ? "#00daf3" : "#ffffff", fontSize: 13, fontWeight: "700" }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Filter by Status (Success, Pending, Failed) */}
            <Text style={{ color: "#8b93a7", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {isEN ? "Status" : "ሁኔታ"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {[
                { key: "all", label: isEN ? "All Statuses" : "ሁሉንም" },
                { key: "success", label: isEN ? "Completed" : "ተጠናቅቋል" },
                { key: "pending", label: isEN ? "Pending" : "በመጠባበቅ ላይ" },
                { key: "failed", label: isEN ? "Failed" : "አልተሳካም" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    haptics.tap();
                    setStatusFilter(opt.key as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: statusFilter === opt.key ? "rgba(16, 185, 129, 0.18)" : "#161c2e",
                    borderWidth: 1,
                    borderColor: statusFilter === opt.key ? "#10b981" : "rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Text style={{ color: statusFilter === opt.key ? "#10b981" : "#ffffff", fontSize: 13, fontWeight: "700" }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reset / Apply Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  haptics.tap();
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#161c2e",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#8b93a7", fontSize: 14, fontWeight: "700" }}>
                  {isEN ? "Reset" : "ዳግም ጀምር"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  haptics.impact();
                  setShowFilterModal(false);
                }}
                style={{
                  flex: 2,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#00daf3",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#060a14", fontSize: 14, fontWeight: "900" }}>
                  {isEN ? "Apply Filters" : "ተግብር"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  // Desktop Header Styles (consistent with history.tsx)
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
    borderColor: "#00daf3",
  },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800" },

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
  toggleBtnActive: { backgroundColor: "#00daf3" },
  toggleBtnText: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  toggleBtnTextActive: { color: "#060a14" },

  // Right Cluster
  utilityCluster: { flexDirection: "row", alignItems: "center", gap: 14 },
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
    backgroundColor: "#00daf3",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: { color: "#fff", fontSize: 10, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#f5b642", fontSize: 9, fontWeight: "700", fontFamily: "Inter, sans-serif" },

  // Scroll View & Layout blueprints
  mainScrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 20 },
  pageContentWrapper: {
    width: "100%",
    maxWidth: 1720,
    alignSelf: "center",
    gap: 20,
    // zoom removed for proper responsive layout
  },
  threeColumnRow: { flexDirection: "row", gap: 20, alignItems: "flex-start", width: "100%" },

  // Sidebar Layout
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
    backgroundColor: "#00daf3",
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
  tokenVal: { color: "#22d3ee", fontSize: 15, fontWeight: "800", marginTop: 2, fontFamily: "Inter, sans-serif" },
  tokenPlusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22d3ee",
    alignItems: "center",
    justifyContent: "center",
  },

  // Navigation Links
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
  navItemActive: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
  },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#00daf3",
  },
  navText: { color: "#8b93a7", fontSize: 13, fontWeight: "600", fontFamily: "Inter, sans-serif" },
  navTextActive: { color: "#e5e3ff", fontWeight: "700" },

  // Wallet
  sectionTitleSmall: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 12, fontFamily: "Inter, sans-serif" },
  walletRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  walletLabel: { color: "#8b93a7", fontSize: 12, fontWeight: "600", fontFamily: "Inter, sans-serif" },
  walletValSmall: { fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  walletValSecond: { color: "#e5e3ff", fontSize: 12, fontWeight: "600", fontFamily: "Inter, sans-serif" },
  walletButtons: { flexDirection: "row", gap: 10, marginTop: 14 },
  walletBtnSmall: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnTextSmall: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },

  // Transactions Header
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  mainTitle: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -0.5, fontFamily: "Inter, sans-serif" },
  subTitle: { color: "#8b93a7", fontSize: 12, fontWeight: "500", marginTop: 2, fontFamily: "Inter, sans-serif" },
  titleUtilBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#12172a",
    borderWidth: 1,
    borderColor: "#1f2540",
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 16, width: '100%' },
  statMiniCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0D1320',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { color: 'rgba(139,147,167,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  statSubtitle: { color: 'rgba(139,147,167,0.4)', fontSize: 10, marginTop: 4, fontWeight: '600' },

  // Tabs and Search row
  tabSearchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  tabGroup: { flexDirection: 'row', backgroundColor: '#0D1320', borderRadius: 16, padding: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  desktopTabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  desktopTabBtnActive: { backgroundColor: '#00DAF3' },
  desktopTabBtnText: { color: '#8b93a7', fontSize: 11, fontWeight: '800', fontFamily: 'Inter, sans-serif' },
  desktopTabBtnTextActive: { color: '#060a14' },

  desktopSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    width: 280,
    height: 38,
  },
  desktopSearchInput: { flex: 1, color: '#fff', fontSize: 12, paddingLeft: 8, fontWeight: '600' },

  // Table Card
  tableCard: {
    backgroundColor: '#0D1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableHeaderCell: { color: '#8b93a7', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableCell: { justifyContent: 'center' },
  tableCircleWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', display: 'flex', justifyContent: 'center' },
  detailsIconBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139,147,167,0.08)', alignItems: 'center', display: 'flex', justifyContent: 'center' },
  tablePopoverMenu: {
    position: 'absolute',
    right: 24,
    top: 20,
    backgroundColor: '#0D1320',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 6,
    zIndex: 999,
    width: 140,
  },
  popoverItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  popoverItemText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Pagination Footer
  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  paginationInfo: { color: '#8b93a7', fontSize: 12, fontWeight: '600' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#1f2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageNumberBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberBtnActive: { backgroundColor: '#00daf3', borderColor: '#00daf3' },
  pageNumberText: { color: "#8b93a7", fontSize: 11, fontWeight: "800" },
  pageNumberTextActive: { color: "#060a14" },

  // ─── 2-COLUMN DESKTOP ARCHITECTURE (INSPIRATION SPEC) ───
  twoColumnLayout: {
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
    width: "100%",
  },
  leftColumn: {
    width: 380,
    gap: 20,
  },
  cardWrapper: {
    width: "100%",
  },
  walletBalanceCard: {
    width: "100%",
    minHeight: 132,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.22)",
    justifyContent: "space-between",
    gap: 18,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)" } as any : {}),
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletLabelDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#00DAF3",
  },
  cardBalanceLabel: {
    color: "rgba(255, 255, 255, 0.58)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  walletAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  walletCurrencyTag: {
    color: "#00DAF3",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardBalanceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  cardTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Fast Actions
  fastActionsSection: {
    gap: 10,
  },
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  fastActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButtonCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0D1320",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...(Platform.OS === "web" ? { boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" } as any : {}),
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  // Activities
  activitiesSection: {
    gap: 12,
  },
  activitiesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activitiesTotalSum: {
    color: "#00DAF3",
    fontSize: 16,
    fontWeight: "900",
  },
  activitiesCard: {
    backgroundColor: "#0D1320",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    gap: 12,
    ...(Platform.OS === "web" ? { boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)" } as any : {}),
  },
  emptyActivitiesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 6,
  },
  emptyActivitiesText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyActivitiesSub: {
    color: "rgba(255, 255, 255, 0.25)",
    fontSize: 11,
    fontWeight: "500",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  activitySubtitle: {
    color: "rgba(139, 147, 167, 0.5)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 12,
    fontWeight: "900",
  },
  activityShare: {
    color: "#8B93A7",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  activityOutcomeTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Right Column: Payment History
  rightColumnBox: {
    flex: 1,
    minWidth: 0,
    gap: 16,
  },
  paymentHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
  },
  paymentHistoryTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  paymentHistorySub: {
    color: "#8B93A7",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  historyToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1320",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    width: 220,
    height: 38,
  },
  historySearchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    paddingLeft: 8,
    fontWeight: "600",
  },
  exportPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#0D1320",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  exportPillText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  desktopFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    zIndex: 250,
    position: "relative",
  },
  segmentedFilterWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A0F1A",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  segmentedFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentedFilterPillActive: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    borderColor: "rgba(0, 218, 243, 0.35)",
  },
  segmentedFilterText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  segmentedFilterTextActive: {
    color: "#00DAF3",
    fontWeight: "800",
  },
  segmentedCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  segmentedCountBadgeActive: {
    backgroundColor: "rgba(0, 218, 243, 0.2)",
  },
  segmentedCountText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
  },
  segmentedCountTextActive: {
    color: "#00DAF3",
  },
  statusFilterAnchor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    position: "relative",
    zIndex: 260,
  },
  resetFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  resetFilterText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  statusDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#0D1320",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statusDropdownTriggerActive: {
    backgroundColor: "rgba(0, 218, 243, 0.1)",
    borderColor: "rgba(0, 218, 243, 0.35)",
  },
  statusDropdownText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  statusDropdownMenu: {
    position: "absolute",
    top: 42,
    right: 0,
    width: 176,
    backgroundColor: "#0F1626",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 6,
    gap: 2,
    zIndex: 100,
    ...(Platform.OS === "web" ? { boxShadow: "0 14px 34px rgba(0, 0, 0, 0.55)" } as any : {}),
  },
  statusDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
  },
  statusDropdownItemActive: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
  },
  statusMenuDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDropdownItemText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  paymentListCard: {
    backgroundColor: "#0D1320",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    zIndex: 1,
    position: "relative",
    ...(Platform.OS === "web" ? { boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)" } as any : {}),
  },
  paymentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  paymentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentItemTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  paymentItemRef: {
    color: "rgba(139, 147, 167, 0.5)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  paymentItemDate: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  paymentItemTime: {
    color: "rgba(139, 147, 167, 0.5)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  paymentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    gap: 5,
  },
  paymentStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  paymentStatusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  paymentItemAmount: {
    fontSize: 14,
    fontWeight: "900",
  },
  paymentItemActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginLeft: 6,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a1a" },
  container: { flex: 1 },
  desktopContainer: { maxWidth: 960, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: { color: "#e5e3ff", fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  headerSub: { color: "rgba(168,167,212,0.55)", fontSize: 12, fontWeight: "600", marginTop: 2 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginRight: 10,
    width: 240,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    paddingLeft: 8,
    fontWeight: '600',
  },

  mobileSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    height: 44,
  },
  mobileSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingLeft: 10,
    fontWeight: '600',
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,229,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  summaryLabel: { color: "rgba(168,167,212,0.6)", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  summaryValue: { fontSize: 17, fontWeight: "900" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  filterTabActive: {
    backgroundColor: "rgba(0,229,255,0.15)",
    borderColor: "rgba(0,229,255,0.35)",
  },
  filterTabText: { color: "rgba(168,167,212,0.6)", fontSize: 12, fontWeight: "700" },
  filterTabTextActive: { color: "#00e5ff" },

  sectionLabel: {
    color: "rgba(168,167,212,0.4)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },

  txCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 10,
    marginHorizontal: 16,
  },
  txIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  txMidRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  txType: { color: "#e5e3ff", fontSize: 15, fontWeight: "800", flex: 1 },
  txAmount: { fontSize: 15, fontWeight: "900" },
  txMethod: { color: "rgba(168,167,212,0.55)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  txRef: { color: "rgba(168,167,212,0.35)", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  txDate: { color: "rgba(168,167,212,0.35)", fontSize: 11, fontWeight: "600" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyText: { color: "#e5e3ff", fontSize: 16, fontWeight: "800" },
  emptySubText: { color: "rgba(168,167,212,0.5)", fontSize: 13, fontWeight: "600", textAlign: "center", paddingHorizontal: 32 },

  tableCard: {
    backgroundColor: '#0D1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableHeaderCell: {
    color: '#8b93a7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2540',
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableTypeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tablePopoverMenu: {
    position: 'absolute',
    right: 24,
    top: 20,
    backgroundColor: '#12172a',
    borderWidth: 1,
    borderColor: '#1f2540',
    borderRadius: 12,
    padding: 6,
    zIndex: 999,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  popoverItemText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 7, 16, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  bonusModal: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  bonusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,242,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#e5e3ff',
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: 'rgba(168,167,212,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  redeemBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLink: {
    alignItems: 'center',
    marginBottom: 24,
  },
  claimLinkText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bonusLogList: {
    maxHeight: 200,
  },
  bonusLogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bonusLogTitle: {
    color: '#e5e3ff',
    fontSize: 14,
    fontWeight: '700',
  },
  bonusLogDate: {
    color: 'rgba(168,167,212,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  bonusLogAmount: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBonusLog: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyBonusText: {
    color: 'rgba(168,167,212,0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  closeModalBtnText: {
    color: '#0a0a0f',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  detailModalCard: {
    width: '90%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  detailModalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
  },
  detailModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowLabel: {
    color: '#8b93a7',
    fontSize: 12,
    fontWeight: '600',
  },
  detailRowValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailDownloadBtn: {
    flexDirection: 'row',
    backgroundColor: '#22d3ee',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDownloadBtnText: {
    color: '#0a0e1a',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
