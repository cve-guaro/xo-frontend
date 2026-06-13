// app/(authed)/transactions/index.tsx
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../../config";
import { useAuth } from "../../../context/authContext";
import AnimatedList from "../../../components/AnimatedList";

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
  const { language, t, showAlert } = useAuth();
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
        // Refresh transactions and bonus logs without full page reload
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

const TransactionItem = memo(function TransactionItem({ 
  tx, 
  isEN 
}: { 
  tx: Transaction; 
  isEN: boolean;
}) {
  const type = normalizeType(tx);
  const status = normalizeStatus(tx);

  const isDeposit = type === "deposit";
  const isSuccess = status === "success";
  const isPending = status === "pending";

  const statusColor = isSuccess ? "#34d399" : isPending ? "#fbbf24" : "#f87171";
  const typeColor = isDeposit ? "#34d399" : type === "prize" ? "#00e5ff" : "#f87171";
  const typeIcon = isDeposit ? "arrow-down-circle" : type === "prize" ? "gift" : "arrow-up-circle";
  const typeBg = isDeposit
    ? "rgba(16,185,129,0.12)"
    : type === "prize"
    ? "rgba(0,229,255,0.12)"
    : "rgba(239,68,68,0.12)";

  const txDate = tx?.createdAt || (tx as any)?.created_at || "";
  const txRef = tx?.ref || tx?.tx_id || tx?.id || "";
  const safeRef = String(txRef || "");

  return (
    <View style={styles.txCard}>
      <LinearGradient
        colors={isDeposit ? ["rgba(16,185,129,0.07)", "rgba(16,185,129,0.01)"] : ["rgba(239,68,68,0.07)", "rgba(239,68,68,0.01)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.txIcon, { backgroundColor: typeBg }]}>
        <Ionicons name={typeIcon as any} size={22} color={typeColor} />
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
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}44` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isSuccess ? (isEN ? "Success" : "ተሳክቷል") : isPending ? (isEN ? "Pending" : "በመጠባበቅ ላይ") : (isEN ? "Failed" : "አልተሳካም")}
            </Text>
          </View>
        </View>

        {!!safeRef && (
          <Text style={styles.txRef} numberOfLines={1}>
            {isEN ? "Ref: " : "ማጣቀሻ: "}{safeRef.slice(0, 20)}{safeRef.length > 20 ? "..." : ""}
          </Text>
        )}
        <Text style={styles.txDate}>{txDate ? formatDate(txDate) : "—"}</Text>
      </View>
    </View>
  );
});

// ---------------- Screen ----------------

export default function TransactionsScreen() {
  const router = useRouter();
  const { token, language } = useAuth();
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = width > 768 && isWeb;

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusLogs, setBonusLogs] = useState<any[]>([]);

  const fetchTxs = useCallback(async () => {
    try {
      // Fetch transactions AND bonus logs in parallel
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
      } else {
        console.error('[transactions] Failed to fetch bonus logs:', (bonusRes as any).status);
      }
    } catch (e) {
      console.error("[transactions] fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isWeb]);

  // Unified fetch: useFocusEffect is sufficient as it triggers on mount and on returns to screen.
  // We remove the separate useEffect to prevent double-fetching on mount.
  useFocusEffect(
    useCallback(() => {
      fetchTxs();
    }, [fetchTxs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTxs();
  }, [fetchTxs]);

  const filteredTxs = useMemo(() => txs.filter((t) => {
    const type = normalizeType(t);
    if (filter === "all") return type !== "prize";
    return type === filter;
  }), [txs, filter]);

  const stats = useMemo(() => {
    let dep = 0;
    let wit = 0;
    txs.forEach((t) => {
      const s = normalizeStatus(t);
      if (s !== "success") return;
      const type = normalizeType(t);
      if (type === "deposit") dep += Number(t.amount) || 0;
      else if (type === "withdrawal") wit += Number(t.amount) || 0;
    });
    return { dep, wit };
  }, [txs]);

  const renderTx = useCallback((item: Transaction) => (
    <TransactionItem key={item.id} tx={item} isEN={isEN} />
  ), [isEN]);

   return (
     <SafeAreaView style={styles.safe} edges={isDesktop ? ["bottom"] : ["top", "left", "right", "bottom"]}>
       <BonusTrackingLogModal 
         visible={bonusModalVisible} 
         onClose={() => {
           setBonusModalVisible(false);
         }}
         bonusLogs={bonusLogs}
         token={token}
         fetchTxs={fetchTxs}
       />
       <View style={[styles.container, isDesktop && styles.desktopContainer]}>
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

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <LinearGradient colors={["rgba(0,229,255,0.18)", "rgba(0,229,255,0.06)"]} style={styles.summaryCard}>
            <Ionicons name="arrow-down-circle-outline" size={22} color="#00e5ff" />
            <Text style={styles.summaryLabel}>{isEN ? "Total Deposits" : "ጠቅላላ ተቀማጭ"}</Text>
            <Text style={[styles.summaryValue, { color: "#00e5ff" }]}>
              ETB {stats.dep.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </LinearGradient>
          <LinearGradient colors={["rgba(239,68,68,0.18)", "rgba(239,68,68,0.06)"]} style={styles.summaryCard}>
            <Ionicons name="arrow-up-circle-outline" size={22} color="#f87171" />
            <Text style={styles.summaryLabel}>{isEN ? "Total Withdrawals" : "ጠቅላላ ወጪ"}</Text>
            <Text style={[styles.summaryValue, { color: "#f87171" }]}>
              ETB {stats.wit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        {/* Transaction List */}
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
                  <View style={{ width: 100, height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, marginTop: 4 }} />
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
    </SafeAreaView>
  );
}

 const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#0a0a1a" },
    container: { flex: 1 },
   desktopContainer: { maxWidth: 760, alignSelf: "center", width: "100%" },
   header: {
     flexDirection: "row",
     alignItems: "center",
     gap: 12,
     paddingHorizontal: 16,
     paddingVertical: 16,
     borderBottomWidth: 1,
     borderBottomColor: "rgba(255,255,255,0.05)",
   },
   modalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0,0,0,0.85)',
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
   },
   bonusModal: {
     width: '100%',
     maxWidth: 480,
     borderRadius: 24,
     borderWidth: 1,
     padding: 24,
     maxHeight: '85%',
   },
   modalHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 24,
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
  headerTitle: { color: "#e5e3ff", fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  headerSub: { color: "rgba(168,167,212,0.55)", fontSize: 12, fontWeight: "600", marginTop: 2 },

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
  statusText: { fontSize: 11, fontWeight: "800" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyText: { color: "#e5e3ff", fontSize: 16, fontWeight: "800" },
  emptySubText: { color: "rgba(168,167,212,0.5)", fontSize: 13, fontWeight: "600", textAlign: "center", paddingHorizontal: 32 },
});
