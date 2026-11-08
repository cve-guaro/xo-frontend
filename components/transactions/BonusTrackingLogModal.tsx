import React, { memo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../config";
import { useAuth } from "../../context/authContext";

export interface BonusTrackingLogModalProps {
  visible: boolean;
  onClose: () => void;
  bonusLogs: any[];
  token: string | null;
  fetchTxs?: () => void;
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

export const BonusTrackingLogModal = memo(function BonusTrackingLogModal({
  visible,
  onClose,
  bonusLogs,
  token,
  fetchTxs,
}: BonusTrackingLogModalProps) {
  const { language, showAlert } = useAuth();
  const isEN = language === "en";
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const redeemCode = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/account/redeem-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(
          isEN ? "Success" : "ተሳክቷል",
          isEN ? `Success! +${data.amount} ETB bonus added` : `ተሳክቷል! +${data.amount} ETB ቦነስ ተጨምሯል`
        );
        setCode("");
        if (fetchTxs) {
          setTimeout(() => fetchTxs(), 500);
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Invalid code" }));
        showAlert(
          isEN ? "Redemption Failed" : "መቀበል አልተቻለም",
          err.error || (isEN ? "Invalid or expired code" : "የተሳሳተ ወይም የጨረሰ ኮድ")
        );
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
      <View style={modalStyles.modalOverlay}>
        <View
          style={[
            modalStyles.bonusModal,
            { backgroundColor: "rgba(10,10,20,0.98)", borderColor: "rgba(0,242,255,0.3)" },
          ]}
        >
          <View style={modalStyles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={modalStyles.bonusIconBox}>
                <Ionicons name="gift" size={24} color="#00e5ff" />
              </View>
              <View>
                <Text style={modalStyles.modalTitle}>{isEN ? "Bonus Tracking Log" : "ቦነስ ታሪክ"}</Text>
                <Text style={modalStyles.modalSubtitle}>
                  {isEN ? "View your reward history" : "የሽልማትዎን ታሪክ ይመልከቱ"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#e5e3ff" />
            </TouchableOpacity>
          </View>

          {/* Gift Code Input */}
          <View style={modalStyles.codeInputContainer}>
            <TextInput
              style={modalStyles.codeInput}
              placeholder={isEN ? "ENTER GIFT CODE" : "የስጦታ ኮድ ያስገቡ"}
              placeholderTextColor="rgba(0,242,255,0.4)"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={modalStyles.redeemBtn}
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

          <TouchableOpacity onPress={() => {}} style={modalStyles.claimLink}>
            <Text style={modalStyles.claimLinkText}>
              {isEN ? "HAVE A VOUCHER? CLAIM IT HERE" : "ቦቸር አለህ? እዚህ ይክፈሉ"}
            </Text>
          </TouchableOpacity>

          {/* Bonus Log List */}
          <ScrollView style={modalStyles.bonusLogList} showsVerticalScrollIndicator={false}>
            {bonusLogs.length === 0 ? (
              <View style={modalStyles.emptyBonusLog}>
                <Ionicons name="gift-outline" size={48} color="rgba(0,242,255,0.2)" />
                <Text style={modalStyles.emptyBonusText}>
                  {isEN ? "No bonus history yet" : "ምንም ቦነስ ታሪክ የለም"}
                </Text>
              </View>
            ) : (
              bonusLogs.map((log, i) => (
                <View key={i} style={modalStyles.bonusLogItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.bonusLogTitle}>
                      {log.reason || (isEN ? "Bonus Credit" : "ቦነስ ክሬዲት")}
                    </Text>
                    <Text style={modalStyles.bonusLogDate}>
                      {log.created_at ? formatDate(log.created_at) : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={modalStyles.bonusLogAmount}>
                      +ETB {Number(log.amount || 0).toFixed(2)}
                    </Text>
                    <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "700", marginTop: 2 }}>
                      {isEN ? "CLAIMED" : "ተወስዷል"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={modalStyles.closeModalBtn} onPress={onClose}>
            <Text style={modalStyles.closeModalBtnText}>{isEN ? "CLOSE" : "ይዝጋ"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const modalStyles = StyleSheet.create({
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
    backgroundColor: "rgba(0,242,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#e5e3ff",
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "rgba(168,167,212,0.5)",
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  codeInputContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    height: 52,
    backgroundColor: "rgba(0,242,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,242,255,0.3)",
    borderRadius: 16,
    paddingHorizontal: 16,
    color: "#e5e3ff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  redeemBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#00e5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  claimLink: {
    alignItems: "center",
    marginBottom: 24,
  },
  claimLinkText: {
    color: "#00e5ff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bonusLogList: {
    maxHeight: 200,
  },
  bonusLogItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  bonusLogTitle: {
    color: "#e5e3ff",
    fontSize: 14,
    fontWeight: "700",
  },
  bonusLogDate: {
    color: "rgba(168,167,212,0.4)",
    fontSize: 11,
    fontWeight: "600",
  },
  bonusLogAmount: {
    color: "#34d399",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyBonusLog: {
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  emptyBonusText: {
    color: "rgba(168,167,212,0.4)",
    fontSize: 13,
    fontWeight: "600",
  },
  closeModalBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#00e5ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  closeModalBtnText: {
    color: "#0a0a0f",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
