// app/(authed)/home/transactions.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState, memo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
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
import AnimatedList from "../../../components/AnimatedList";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import ProfileEditModal from "../../../components/ProfileEditModal";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import ReferralModal from "../../../components/ReferralModal";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import NotificationsPopover from "../../../components/NotificationsPopover";

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
const BonusTrackingLogModal = memo(function BonusTrackingLogModal({ 
  visible, 
  onClose, 
  bonusLogs,
  token,
  fetchTxs
}: { 
  visible: boolean; 
  onClose: () => void;
  bonusLogs: any[];
  token: string | null;
  fetchTxs?: () => void;
}) {
  const { language, showAlert } = useAuth();
  const isEN = language === "en";
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const redeemCode = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/account/redeem-code`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() })
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(isEN ? "Success" : "ተሳክቷል", isEN ? `Success! +${data.amount} ETB bonus added` : `ተሳክቷል! +${data.amount} ETB ቦነስ ተጨምሯል`);
        setCode("");
        if (fetchTxs) {
          setTimeout(() => fetchTxs(), 500);
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Invalid code" }));
        showAlert(isEN ? "Redemption Failed" : "መቀበል አልተቻለም", err.error || (isEN ? "Invalid or expired code" : "የተሳሳተ ወይም የጨረሰ ኮድ"));
      }
    } catch {
      showAlert(isEN ? "Error" : "ስህተት", isEN ? "Network error" : "ኔትወርክ ስህተት");
    } finally {
      setRedeeming(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.bonusModal, { backgroundColor: 'rgba(10,10,20,0.98)', borderColor: 'rgba(0,242,255,0.3)' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.bonusIconBox}>
                <Ionicons name="gift" size={24} color="#00e5ff" />
              </View>
              <View>
                <Text style={styles.modalTitle}>{isEN ? "Bonus Tracking Log" : "ቦነስ ታሪክ"}</Text>
                <Text style={styles.modalSubtitle}>{isEN ? "View your reward history" : "የሽልማትዎን ታሪክ ይመልከቱ"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#e5e3ff" />
            </TouchableOpacity>
          </View>

          {/* Gift Code Input */}
          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder={isEN ? "ENTER GIFT CODE" : "የስጦታ ኮድ ያስገቡ"}
              placeholderTextColor="rgba(0,242,255,0.4)"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={styles.redeemBtn} 
              onPress={redeemCode}
              disabled={redeeming || !code.trim()}
            >
              {redeeming ? (
                <ActivityIndicator size="small" color="#0a0a0f" />
              ) : (
                <Ionicons name="gift" size={18} color="#0a0a0f" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => {}} style={styles.claimLink}>
            <Text style={styles.claimLinkText}>{isEN ? "HAVE A VOUCHER? CLAIM IT HERE" : "ቦቸር አለህ? እዚህ ይክፈሉ"}</Text>
          </TouchableOpacity>

          {/* Bonus Log List */}
          <ScrollView style={styles.bonusLogList} showsVerticalScrollIndicator={false}>
            {bonusLogs.length === 0 ? (
              <View style={styles.emptyBonusLog}>
                <Ionicons name="gift-outline" size={48} color="rgba(0,242,255,0.2)" />
                <Text style={styles.emptyBonusText}>{isEN ? "No bonus history yet" : "ምንም ቦነስ ታሪክ የለም"}</Text>
              </View>
            ) : (
              bonusLogs.map((log, i) => (
                <View key={i} style={styles.bonusLogItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bonusLogTitle}>{log.reason || (isEN ? "Bonus Credit" : "ቦነስ ክሬዲት")}</Text>
                    <Text style={styles.bonusLogDate}>{log.created_at ? formatDate(log.created_at) : ""}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bonusLogAmount}>+ETB {Number(log.amount || 0).toFixed(2)}</Text>
                    <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '700', marginTop: 2 }}>{isEN ? 'CLAIMED' : 'ተወስዷል'}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
            <Text style={styles.closeModalBtnText}>{isEN ? "CLOSE" : "ይዝጋ"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

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

// ---------------- Main Screen Component ----------------
export default function TransactionsScreen() {
  const router = useRouter();
  const { user, token, language, refreshProfile, switchLanguage, showAlert } = useAuth();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1024 && isWeb;
  const isTablet = width >= 768 && width < 1024 && isWeb;

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal" | "prize">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusLogs, setBonusLogs] = useState<any[]>([]);

  // Navigation and utility states
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Selected Detail Transaction State
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // 3-dots popup options menu state
  const [openMenuTxId, setOpenMenuTxId] = useState<string | null>(null);

  // Pagination state (5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchTxs = useCallback(async () => {
    try {
      const [txRes, bonusRes] = await Promise.all([
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
        }).catch(() => ({ ok: false, status: 0, json: async () => ({ logs: [] }) } as any))
      ]);
      
      const data = await txRes.json();
      if (txRes.ok && data?.ok) {
        setTxs(Array.isArray(data.transactions) ? data.transactions : []);
      }
      
      if (bonusRes.ok) {
        const bonusData = await bonusRes.json();
        setBonusLogs(Array.isArray(bonusData.logs) ? bonusData.logs : []);
      }
    } catch (e) {
      console.error("[transactions] fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isWeb]);

  useFocusEffect(
    useCallback(() => {
      fetchTxs();
    }, [fetchTxs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTxs();
  }, [fetchTxs]);

  // Filter and search logic
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => {
      const type = normalizeType(t);
      const isMatch = filter === "all" ? true : type === filter;
      if (!isMatch) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const ref = String(t.ref || t.tx_id || t.id || "").toLowerCase();
        const method = String(t.method || "").toLowerCase();
        return ref.includes(query) || method.includes(query);
      }
      return true;
    });
  }, [txs, filter, searchQuery]);

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
      const element = document.createElement("a");
      const file = new Blob([receiptContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `xoet_receipt_${tx.id}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
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
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <ProfileEditModal visible={!user?.username} onClose={() => {}} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={refreshProfile} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
      <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />

      {/* Transaction Details Modal */}
      {selectedDetailTx && (
        <Modal visible={!!selectedDetailTx} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.detailModalCard, { backgroundColor: '#0d1220', borderColor: '#1f2540' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.detailModalTitle}>{isEN ? "TRANSACTION DETAILS" : "የግብይት ዝርዝሮች"}</Text>
                <TouchableOpacity onPress={() => setSelectedDetailTx(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#8b93a7" />
                </TouchableOpacity>
              </View>

              {/* Icon & Amount */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={[styles.detailIconBox, { backgroundColor: normalizeType(selectedDetailTx) === 'deposit' || normalizeType(selectedDetailTx) === 'prize' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons 
                    name={normalizeType(selectedDetailTx) === 'deposit' || normalizeType(selectedDetailTx) === 'prize' ? "arrow-down" : "arrow-up"} 
                    size={24} 
                    color={normalizeType(selectedDetailTx) === 'deposit' || normalizeType(selectedDetailTx) === 'prize' ? "#34d399" : "#f87171"} 
                  />
                </View>
                <Text style={[styles.detailModalAmount, { color: normalizeType(selectedDetailTx) === 'deposit' || normalizeType(selectedDetailTx) === 'prize' ? "#34d399" : "#f87171" }]}>
                  {normalizeType(selectedDetailTx) === 'deposit' || normalizeType(selectedDetailTx) === 'prize' ? "+" : "-"}ETB {Number(selectedDetailTx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={{ color: '#8b93a7', fontSize: 12, marginTop: 4 }}>
                  {normalizeStatus(selectedDetailTx).toUpperCase()}
                </Text>
              </View>

              {/* Data Table */}
              <View style={{ gap: 14, marginBottom: 28 }}>
                <View style={styles.detailModalRow}>
                  <Text style={styles.detailRowLabel}>{isEN ? "Transaction ID" : "የግብይት መለያ"}</Text>
                  <Text style={styles.detailRowValue} numberOfLines={1}>{selectedDetailTx.id}</Text>
                </View>
                <View style={styles.detailModalRow}>
                  <Text style={styles.detailRowLabel}>{isEN ? "Reference ID" : "ማጣቀሻ መለያ"}</Text>
                  <Text style={styles.detailRowValue}>{selectedDetailTx.ref || '—'}</Text>
                </View>
                <View style={styles.detailModalRow}>
                  <Text style={styles.detailRowLabel}>{isEN ? "Date & Time" : "ቀን እና ሰዓት"}</Text>
                  <Text style={styles.detailRowValue}>{formatDate(selectedDetailTx.createdAt)}</Text>
                </View>
                <View style={styles.detailModalRow}>
                  <Text style={styles.detailRowLabel}>{isEN ? "Payment Method" : "የክፍያ ዘዴ"}</Text>
                  <Text style={styles.detailRowValue}>{(selectedDetailTx.method || "Chapa").toUpperCase()}</Text>
                </View>
              </View>

              {/* Actions */}
              <TouchableOpacity 
                style={styles.detailDownloadBtn} 
                onPress={() => {
                  handleDownloadReceipt(selectedDetailTx);
                  setSelectedDetailTx(null);
                }}
              >
                <Ionicons name="download-outline" size={16} color="#0a0a0f" style={{ marginRight: 6 }} />
                <Text style={styles.detailDownloadBtnText}>{isEN ? "DOWNLOAD RECEIPT" : "ደረሰኝ አውርድ"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {isDesktop ? (
        /* ────────── PREMIUM DESKTOP LAYOUT ────────── */
        <View style={{ flex: 1 }}>
          {/* Header Bar */}
          <View style={s.header}>
            <View style={s.headerContentWrapper}>
              <View style={s.logoContainer}>
                <Image source={require("../../../assets/images/icon.jpg")} style={s.logoImage} />
                <Text style={s.logoText}>XO ETHIOPIA</Text>
              </View>

              {/* Center Navigation Toggle */}
              <View style={s.toggleContainer}>
                <TouchableOpacity style={s.toggleBtn} onPress={() => router.push('/(authed)/home/gameplay')} activeOpacity={0.85}>
                  <Text style={s.toggleBtnText}>SPIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.toggleBtn, s.toggleBtnActive]} onPress={() => router.push('/(authed)/home/gameplay')} activeOpacity={0.85}>
                  <Text style={[s.toggleBtnText, s.toggleBtnTextActive]}>XO GAME</Text>
                </TouchableOpacity>
              </View>

              {/* Top Navigation Utilities (Header Balance is removed as requested) */}
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

          {/* Main Scroll Content */}
          <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.pageContentWrapper}>
              <View style={s.threeColumnRow}>
                {/* 1. LEFT SIDEBAR (No bottom profile chip, balance amount card, or logout button as requested) */}
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

                    {/* Available Balance card (Moved from header to sidebar as requested) */}
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

                  {/* Navigation Links */}
                  <View style={s.card}>
                    <TouchableOpacity onPress={() => handleNavClick('home')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="home-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavClick('history')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="time-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavClick('leaderboard')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="trophy-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Leaderboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavClick('transactions')} style={[s.navItem, s.navItemActive]} activeOpacity={0.8}>
                      <View style={s.navItemActiveBar} />
                      <Ionicons name="swap-horizontal" size={18} color="#8b5cf6" />
                      <Text style={[s.navText, s.navTextActive]}>Transactions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.navItem} activeOpacity={0.8}>
                      <Ionicons name="person-outline" size={18} color="#8b93a7" />
                      <Text style={s.navText}>Profile</Text>
                    </TouchableOpacity>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'maintenance') && (
                      <TouchableOpacity onPress={() => handleNavClick('admin')} style={s.navItem} activeOpacity={0.8}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#8b93a7" />
                        <Text style={s.navText}>Admin Center</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Wallet panel card */}
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
                </View>

                {/* 2. TRANSACTIONS MAIN PANEL */}
                <View style={{ flex: 1, gap: 24 }}>
                  {/* Title & Utilities Header */}
                  <View style={s.titleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
                        <Ionicons name="arrow-back" size={18} color="#fff" />
                      </TouchableOpacity>
                      <View>
                        <Text style={s.mainTitle}>Transactions</Text>
                        <Text style={s.subTitle}>Track all your financial activities in one place</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity style={s.titleUtilBtn}>
                        <Ionicons name="funnel-outline" size={16} color="#8b93a7" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleDownloadAllReceipts} style={s.titleUtilBtn}>
                        <Ionicons name="download-outline" size={16} color="#8b93a7" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Dynamic Stat Cards Grid */}
                  <View style={s.statsGrid}>
                    {/* Net Flow */}
                    <LinearGradient colors={["rgba(34,211,238,0.12)", "rgba(34,211,238,0.03)"]} style={s.statMiniCard}>
                      <View style={[s.statIconWrap, { backgroundColor: 'rgba(34,211,238,0.15)' }]}>
                        <Ionicons name="swap-horizontal" size={16} color="#22d3ee" />
                      </View>
                      <View>
                        <Text style={s.statLabel}>NET FLOW</Text>
                        <Text style={[s.statValue, { color: "#22d3ee" }]}>
                          {stats.netFlow >= 0 ? "+" : "-"} ETB {Math.abs(stats.netFlow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                        <Text style={s.statSubtitle}>{stats.successCount} successful transactions</Text>
                      </View>
                    </LinearGradient>

                    {/* Total Deposits */}
                    <LinearGradient colors={["rgba(168,85,247,0.12)", "rgba(168,85,247,0.03)"]} style={s.statMiniCard}>
                      <View style={[s.statIconWrap, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                        <Ionicons name="arrow-down" size={16} color="#a855f7" />
                      </View>
                      <View>
                        <Text style={s.statLabel}>DEPOSITS</Text>
                        <Text style={[s.statValue, { color: "#a855f7" }]}>{stats.depCount}</Text>
                        <Text style={s.statSubtitle}>Total deposits</Text>
                      </View>
                    </LinearGradient>

                    {/* Total Withdrawals */}
                    <LinearGradient colors={["rgba(249,115,22,0.12)", "rgba(249,115,22,0.03)"]} style={s.statMiniCard}>
                      <View style={[s.statIconWrap, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                        <Ionicons name="arrow-up" size={16} color="#f97316" />
                      </View>
                      <View>
                        <Text style={s.statLabel}>WITHDRAWALS</Text>
                        <Text style={[s.statValue, { color: "#f97316" }]}>{stats.witCount}</Text>
                        <Text style={s.statSubtitle}>Total withdrawals</Text>
                      </View>
                    </LinearGradient>

                    {/* Won Prizes */}
                    <LinearGradient colors={["rgba(34,197,94,0.12)", "rgba(34,197,94,0.03)"]} style={s.statMiniCard}>
                      <View style={[s.statIconWrap, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                        <Ionicons name="trophy" size={16} color="#22c55e" />
                      </View>
                      <View>
                        <Text style={s.statLabel}>WON PRIZES</Text>
                        <Text style={[s.statValue, { color: "#22c55e" }]}>{stats.prizeCount}</Text>
                        <Text style={s.statSubtitle}>Total prizes won</Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Tabs & Search Container */}
                  <View style={s.tabSearchRow}>
                    <View style={s.tabGroup}>
                      {(["all", "deposit", "withdrawal", "prize"] as const).map((t) => (
                        <TouchableOpacity
                          key={t}
                          onPress={() => {
                            setFilter(t);
                            setCurrentPage(1);
                          }}
                          style={[s.desktopTabBtn, filter === t && s.desktopTabBtnActive]}
                        >
                          <Text style={[s.desktopTabBtnText, filter === t && s.desktopTabBtnTextActive]}>
                            {t === "all" ? "All Transactions" : t === "deposit" ? "Deposits" : t === "withdrawal" ? "Withdrawals" : "Prizes"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={s.desktopSearchWrap}>
                      <Ionicons name="search" size={14} color="#8b93a7" />
                      <TextInput
                        style={s.desktopSearchInput}
                        placeholder="Search transactions..."
                        placeholderTextColor="rgba(139,147,167,0.4)"
                        value={searchQuery}
                        onChangeText={(txt) => {
                          setSearchQuery(txt);
                          setCurrentPage(1);
                        }}
                      />
                    </View>
                  </View>

                  {/* Table Card layout matching screenshot */}
                  <View style={s.tableCard}>
                    {/* Headers */}
                    <View style={s.tableHeaderRow}>
                      <Text style={[s.tableHeaderCell, { flex: 2 }]}>TYPE</Text>
                      <Text style={[s.tableHeaderCell, { flex: 2.2 }]}>DETAILS</Text>
                      <Text style={[s.tableHeaderCell, { flex: 1.2 }]}>AMOUNT</Text>
                      <Text style={[s.tableHeaderCell, { flex: 1.2 }]}>STATUS</Text>
                      <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>DATE</Text>
                      <Text style={[s.tableHeaderCell, { flex: 0.4, textAlign: 'center' }]}></Text>
                    </View>

                    {/* Table body */}
                    {loading ? (
                      <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#00e5ff" />
                      </View>
                    ) : paginatedTxs.length === 0 ? (
                      <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '700' }}>No transactions recorded</Text>
                      </View>
                    ) : (
                      paginatedTxs.map((item, idx) => {
                        const type = normalizeType(item);
                        const status = normalizeStatus(item);
                        const isDeposit = type === "deposit";
                        const isSuccess = status === "success";
                        const isPending = status === "pending";

                        const statusColor = isSuccess ? "#34d399" : isPending ? "#fbbf24" : "#f87171";
                        const typeColor = isDeposit ? "#34d399" : type === "prize" ? "#00e5ff" : "#f87171";
                        const typeIcon = isDeposit ? "arrow-down" : type === "prize" ? "gift" : "arrow-up";

                        return (
                          <View key={item.id || idx} style={[s.tableRow, idx % 2 === 1 && { backgroundColor: 'rgba(255,255,255,0.01)' }]}>
                            {/* Column 1: TYPE */}
                            <View style={[s.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                              <View style={[s.tableCircleWrap, { backgroundColor: isDeposit || type === "prize" ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                                <Ionicons name={typeIcon as any} size={14} color={typeColor} />
                              </View>
                              <View>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                                  {isDeposit ? "Deposit" : type === "prize" ? "Prize" : "Withdrawal"}
                                </Text>
                                {!!item.ref && (
                                  <Text style={{ color: 'rgba(139,147,167,0.4)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                                    Ref: {item.ref.slice(0, 14)}{item.ref.length > 14 ? "..." : ""}
                                  </Text>
                                )}
                              </View>
                            </View>

                            {/* Column 2: DETAILS */}
                            <View style={[s.tableCell, { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                              <View style={s.detailsIconBox}>
                                <Ionicons name="people" size={14} color="#8b93a7" />
                              </View>
                              <View>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                                  {(item.method || "Chapa").toUpperCase()}
                                </Text>
                                <Text style={{ color: 'rgba(139,147,167,0.4)', fontSize: 10, marginTop: 2 }}>
                                  {formatDate(item.createdAt)}
                                </Text>
                              </View>
                            </View>

                            {/* Column 3: AMOUNT */}
                            <View style={[s.tableCell, { flex: 1.2 }]}>
                              <Text style={{ color: typeColor, fontSize: 13, fontWeight: '900' }}>
                                {isDeposit || type === "prize" ? "+" : "-"}ETB {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </Text>
                            </View>

                            {/* Column 4: STATUS */}
                            <View style={[s.tableCell, { flex: 1.2 }]}>
                              <View style={[s.statusBadge, { alignSelf: 'flex-start', backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35`, paddingHorizontal: 10, paddingVertical: 4 }]}>
                                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[s.statusText, { color: statusColor, textTransform: 'uppercase' }]}>{status}</Text>
                              </View>
                            </View>

                            {/* Column 5: DATE */}
                            <View style={[s.tableCell, { flex: 1.5 }]}>
                              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{formatDateOnly(item.createdAt)}</Text>
                              <Text style={{ color: 'rgba(139,147,167,0.4)', fontSize: 10, marginTop: 2 }}>{formatTimeOnly(item.createdAt)}</Text>
                            </View>

                            {/* Column 6: ACTION */}
                            <View style={[s.tableCell, { flex: 0.4, alignItems: 'center', position: 'relative' }]}>
                              <TouchableOpacity onPress={() => setOpenMenuTxId(openMenuTxId === item.id ? null : item.id)} style={{ padding: 6 }}>
                                <Ionicons name="ellipsis-vertical" size={14} color="#8b93a7" />
                              </TouchableOpacity>

                              {openMenuTxId === item.id && (
                                <View style={s.tablePopoverMenu}>
                                  <TouchableOpacity 
                                    style={s.popoverItem} 
                                    onPress={() => {
                                      setSelectedDetailTx(item);
                                      setOpenMenuTxId(null);
                                    }}
                                  >
                                    <Ionicons name="eye-outline" size={13} color="#fff" />
                                    <Text style={s.popoverItemText}>View Details</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={s.popoverItem} 
                                    onPress={() => {
                                      handleDownloadReceipt(item);
                                      setOpenMenuTxId(null);
                                    }}
                                  >
                                    <Ionicons name="download-outline" size={13} color="#fff" />
                                    <Text style={s.popoverItemText}>Download</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}

                    {/* Pagination footer */}
                    {renderPagination()}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        /* ────────── MOBILE PORTRAIT LAYOUT ────────── */
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{isEN ? "Transactions" : "ግብይቶች"}</Text>
              <Text style={styles.headerSub}>{isEN ? "Your deposit & withdrawal history" : "የክፍያ ታሪክዎ"}</Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={() => setBonusModalVisible(true)}>
              <Ionicons name="gift-outline" size={18} color="#00e5ff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
              {refreshing ? <ActivityIndicator size="small" color="#00e5ff" /> : <Ionicons name="refresh" size={18} color="#00e5ff" />}
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.mobileSearchContainer}>
            <Ionicons name="search-outline" size={16} color="#8b93a7" style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.mobileSearchInput}
              placeholder={isEN ? "Search by ref or method..." : "በማጣቀሻ ወይም ዘዴ ፈልግ..."}
              placeholderTextColor="rgba(139,147,167,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <LinearGradient colors={["rgba(0,229,255,0.18)", "rgba(0,229,255,0.06)"]} style={styles.summaryCard}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="#00e5ff" />
              <Text style={styles.summaryLabel}>{isEN ? "Total Deposits" : "ጠቅላላ ተቀማጭ"}</Text>
              <Text style={[styles.summaryValue, { color: "#00e5ff" }]}>
                ETB {stats.netFlow >= 0 ? stats.netFlow.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </Text>
            </LinearGradient>
            <LinearGradient colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.06)"]} style={styles.summaryCard}>
              <Ionicons name="arrow-up-circle-outline" size={22} color="#f87171" />
              <Text style={styles.summaryLabel}>{isEN ? "Total Withdrawals" : "ጠቅላላ ወጪ"}</Text>
              <Text style={[styles.summaryValue, { color: "#f87171" }]}>
                ETB {Number(user?.available_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </LinearGradient>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(["all", "deposit", "withdrawal"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                  {f === "all" ? (isEN ? "All" : "ሁሉም") : f === "deposit" ? (isEN ? "Deposits" : "ተቀማጭ") : (isEN ? "Withdrawals" : "ወጪ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List content */}
          {loading ? (
            <View style={{ gap: 10, paddingHorizontal: 16 }}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <View key={i} style={[styles.txCard, { opacity: 0.5, marginHorizontal: 0 }]}>
                  <View style={[styles.txIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.txTopRow}>
                      <View style={{ width: 80, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                      <View style={{ width: 60, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    </View>
                    <View style={styles.txMidRow}>
                      <View style={{ width: 50, height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                      <View style={{ width: 60, height: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : filteredTxs.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="receipt-outline" size={52} color="rgba(0, 242, 255, 0.25)" />
              <Text style={styles.emptyText}>{isEN ? "No transactions yet" : "ምንም ግብይት የለም"}</Text>
              <Text style={styles.emptySubText}>
                {isEN ? "Your deposits and withdrawals will appear here" : "ተቀማጭ እና ወጪዎ እዚህ ይታያሉ"}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { paddingHorizontal: 16 }]}>
                {isEN ? `${filteredTxs.length} Transaction${filteredTxs.length !== 1 ? "s" : ""}` : `${filteredTxs.length} ግብይቶች`}
              </Text>
              <AnimatedList
                items={filteredTxs}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" colors={["#00e5ff"]} />}
                renderItem={renderTx}
              />
            </View>
          )}
        </View>
      )}
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
    borderColor: "#7c3aed",
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
  toggleBtnActive: { backgroundColor: "#7c3aed" },
  toggleBtnText: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  toggleBtnTextActive: { color: "#ffffff" },

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
  pageContentWrapper: { width: "100%", gap: 24 },
  threeColumnRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", width: "100%" },

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
    backgroundColor: "rgba(124, 58, 237, 0.08)",
  },
  navItemActiveBar: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#8b5cf6",
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2540',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  tabGroup: { flexDirection: 'row', backgroundColor: '#12172a', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#1f2540' },
  desktopTabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  desktopTabBtnActive: { backgroundColor: '#7c3aed' },
  desktopTabBtnText: { color: '#8b93a7', fontSize: 11, fontWeight: '800', fontFamily: 'Inter, sans-serif' },
  desktopTabBtnTextActive: { color: '#fff' },

  desktopSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2540',
    paddingHorizontal: 16,
    width: 280,
    height: 38,
  },
  desktopSearchInput: { flex: 1, color: '#fff', fontSize: 12, paddingLeft: 8, fontWeight: '600' },

  // Table Card
  tableCard: {
    backgroundColor: '#0d1220',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2540',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#12172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2540',
  },
  tableHeaderCell: { color: '#8b93a7', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2540',
  },
  tableCell: { justifyContent: 'center' },
  tableCircleWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', display: 'flex', justifyContent: 'center' },
  detailsIconBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(139,147,167,0.08)', alignItems: 'center', display: 'flex', justifyContent: 'center' },
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
  popoverItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  popoverItemText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Pagination Footer
  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#12172a',
    borderTopWidth: 1,
    borderTopColor: '#1f2540',
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
  pageNumberBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  pageNumberText: { color: "#8b93a7", fontSize: 11, fontWeight: "800" },
  pageNumberTextActive: { color: "#fff" },
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
    backgroundColor: '#0d1220',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2540',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#12172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2540',
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
