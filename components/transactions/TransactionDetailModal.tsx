import React, { memo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";

export type Transaction = {
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

export interface TransactionDetailModalProps {
  tx: Transaction | null;
  visible: boolean;
  onClose: () => void;
  isEN: boolean;
  onDownloadReceipt?: (tx: Transaction) => void;
}

function formatDate(iso: string) {
  if (!iso) return "—";
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

export const TransactionDetailModal = memo(function TransactionDetailModal({
  tx,
  visible,
  onClose,
  isEN,
  onDownloadReceipt,
}: TransactionDetailModalProps) {
  const slideAnim = React.useRef(new Animated.Value(600)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { width: winW } = useWindowDimensions();
  const isDesktop = winW >= 800;

  React.useEffect(() => {
    if (visible && tx) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(600);
      fadeAnim.setValue(0);
    }
  }, [visible, tx]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible || !tx) return null;

  const type = normalizeType(tx);
  const status = normalizeStatus(tx);
  const isDeposit = type === "deposit";
  const isPrize = type === "prize";
  const isSuccess = status === "success";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {isDesktop ? (
        /* ── DESKTOP VIEW: Centered High-Fi Side-by-Side Modal ── */
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          {/* Backdrop */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0, 0, 0, 0.78)",
              opacity: fadeAnim,
            }}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
          </Animated.View>

          {/* Centered Desktop Modal Card */}
          <Animated.View
            style={{
              width: "100%",
              maxWidth: 620,
              backgroundColor: "#0d1326",
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: "rgba(0, 218, 243, 0.35)",
              padding: 28,
              opacity: fadeAnim,
              transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
            }}
          >
            {/* Desktop Top Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(0, 218, 243, 0.12)", borderWidth: 1, borderColor: "rgba(0, 218, 243, 0.3)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="receipt-outline" size={20} color="#00daf3" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}>
                  {isEN ? "Transaction Receipt" : "የግብይት ደረሰኝ"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#141c30", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Hero Banner: Amount + Status Banner */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#141a2e", borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", gap: 16 }}>
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: isSuccess ? "rgba(16, 185, 129, 0.18)" : status === "pending" ? "rgba(245, 158, 11, 0.18)" : "rgba(239, 68, 68, 0.18)",
                  borderWidth: 1.5,
                  borderColor: isSuccess ? "#10b981" : status === "pending" ? "#f59e0b" : "#ef4444",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isSuccess ? "checkmark" : status === "pending" ? "time-outline" : "close"}
                  size={30}
                  color={isSuccess ? "#10b981" : status === "pending" ? "#f59e0b" : "#ef4444"}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: isSuccess ? "#10b981" : status === "pending" ? "#f59e0b" : "#ef4444", fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {isSuccess
                    ? (isEN ? "Completed Successfully" : "በተሳካ ሁኔታ ተጠናቋል")
                    : status === "pending"
                    ? (isEN ? "Processing In Progress" : "በመከናወን ላይ")
                    : (isEN ? "Transaction Failed" : "ግብይቱ አልተሳካም")}
                </Text>
                <Text style={{ fontSize: 26, fontWeight: "900", color: isDeposit || isPrize ? "#10b981" : "#ef4444", marginTop: 2 }}>
                  {isDeposit || isPrize ? "+" : "-"}ETB {Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Two-Column Side-by-Side Breakdown Grid */}
            <View
              style={{
                width: "100%",
                backgroundColor: "#11172a",
                borderRadius: 18,
                padding: 18,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <View style={{ flexDirection: "row", gap: 20 }}>
                {/* Left Column */}
                <View style={{ flex: 1, gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11.5, color: "#8b93a7", fontWeight: "600", textTransform: "uppercase" }}>{isEN ? "Transaction Type" : "የግብይት ዓይነት"}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#FFFFFF", marginTop: 2, textTransform: "capitalize" }}>{type}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.06)" }} />
                  <View>
                    <Text style={{ fontSize: 11.5, color: "#8b93a7", fontWeight: "600", textTransform: "uppercase" }}>{isEN ? "Payment Channel" : "የክፍያ ዘዴ"}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#00daf3", marginTop: 2 }}>{(tx.method || "Chapa").toUpperCase()}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ width: 1, backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

                {/* Right Column */}
                <View style={{ flex: 1, gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11.5, color: "#8b93a7", fontWeight: "600", textTransform: "uppercase" }}>{isEN ? "Date & Time" : "ቀን እና ሰዓት"}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#FFFFFF", marginTop: 2 }}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.06)" }} />
                  <View>
                    <Text style={{ fontSize: 11.5, color: "#8b93a7", fontWeight: "600", textTransform: "uppercase" }}>{isEN ? "Reference ID" : "የማጣቀሻ ቁጥር"}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#94a3b8", marginTop: 2 }} numberOfLines={1}>
                      {(tx.ref || tx.id || "—")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Desktop Action Row (Side-by-Side Buttons) */}
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {onDownloadReceipt && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    onDownloadReceipt(tx);
                  }}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(0, 218, 243, 0.12)",
                    borderWidth: 1.2,
                    borderColor: "rgba(0, 218, 243, 0.4)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="download-outline" size={17} color="#00daf3" />
                  <Text style={{ color: "#00daf3", fontSize: 14, fontWeight: "800" }}>
                    {isEN ? "Download Receipt" : "ደረሰኝ አውርድ"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  haptics.impact();
                  handleClose();
                }}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#10b981",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#060a14", fontSize: 14.5, fontWeight: "900" }}>
                  {isEN ? "Done" : "ተጠናቅቋል"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      ) : (
        /* ── MOBILE VIEW: Bottom Sheet ── */
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              opacity: fadeAnim,
            }}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
          </Animated.View>

          {/* Slide-Up Bottom Sheet Card */}
          <Animated.View
            style={{
              width: "100%",
              backgroundColor: "#0e1322",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Platform.OS === "ios" ? 40 : 28,
              alignItems: "center",
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Top Pill Handle */}
            <View
              style={{
                width: 38,
                height: 4.5,
                borderRadius: 3,
                backgroundColor: "#222c42",
                marginBottom: 20,
              }}
            />

            {/* Centered Checkmark Badge (Clean, no surrounding sparkles) */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: isSuccess ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)",
                  borderWidth: 1.5,
                  borderColor: isSuccess ? "#10b981" : "#ef4444",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isSuccess ? "checkmark" : status === "pending" ? "time-outline" : "close"}
                  size={38}
                  color={isSuccess ? "#10b981" : status === "pending" ? "#f59e0b" : "#ef4444"}
                />
              </View>
            </View>

            {/* Title: Success ! */}
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: "#ffffff",
                fontFamily: "Inter, sans-serif",
                letterSpacing: -0.3,
                marginBottom: 6,
              }}
            >
              {isSuccess
                ? (isEN ? "Success !" : "ተሳክቷል !")
                : status === "pending"
                ? (isEN ? "Processing..." : "በመከናወን ላይ...")
                : (isEN ? "Failed" : "አልተሳካም")}
            </Text>

            {/* Subtitle description */}
            <Text
              style={{
                fontSize: 13,
                color: "#8b93a7",
                textAlign: "center",
                lineHeight: 18,
                paddingHorizontal: 16,
                marginBottom: 20,
              }}
            >
              {isSuccess
                ? (isEN
                    ? "Your transaction has been processed and added successfully."
                    : "ግብይትዎ በተሳካ ሁኔታ ተከናውኖ ተጨምሯል።")
                : (isEN
                    ? "Transaction details and current status are shown below."
                    : "የግብይት ዝርዝሮች ከታች ይታያሉ።")}
            </Text>

            {/* Structured Detail Breakdown Box */}
            <View
              style={{
                width: "100%",
                backgroundColor: "#141a2e",
                borderRadius: 18,
                padding: 16,
                gap: 12,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: "#8b93a7", fontWeight: "600" }}>{isEN ? "Amount" : "መጠን"}</Text>
                <Text style={{ fontSize: 16, fontWeight: "900", color: isDeposit || isPrize ? "#10b981" : "#ef4444" }}>
                  {isDeposit || isPrize ? "+" : "-"}ETB {Math.floor(Number(tx.amount || 0)).toLocaleString()}
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.06)" }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12.5, color: "#8b93a7", fontWeight: "600" }}>{isEN ? "Type" : "ዓይነት"}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff", textTransform: "capitalize" }}>
                  {type}
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12.5, color: "#8b93a7", fontWeight: "600" }}>{isEN ? "Method" : "ዘዴ"}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>
                  {(tx.method || "Chapa").toUpperCase()}
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12.5, color: "#8b93a7", fontWeight: "600" }}>{isEN ? "Date" : "ቀን"}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#ffffff" }}>
                  {formatDate(tx.createdAt)}
                </Text>
              </View>

              {!!(tx.ref || tx.id) && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12.5, color: "#8b93a7", fontWeight: "600" }}>{isEN ? "Ref ID" : "መለያ"}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#8b93a7" }} numberOfLines={1}>
                    {(tx.ref || tx.id).slice(0, 18)}
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom Button: [ Done ] */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                haptics.impact();
                handleClose();
              }}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 26,
                backgroundColor: "#10b981",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#060a14", fontSize: 15.5, fontWeight: "900", letterSpacing: 0.3 }}>
                {isEN ? "Done" : "ተጠናቅቋል"}
              </Text>
            </TouchableOpacity>

            {/* Download Receipt Link (No Underline) */}
            {onDownloadReceipt && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  haptics.tap();
                  onDownloadReceipt(tx);
                }}
                style={{ marginTop: 14, paddingVertical: 4 }}
              >
                <Text style={{ color: "#00daf3", fontSize: 13, fontWeight: "700" }}>
                  {isEN ? "Download Receipt" : "ደረሰኝ አውርድ"}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      )}
    </Modal>
  );
});

export default TransactionDetailModal;
