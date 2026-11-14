// components/game/RpsBetSelectModal.tsx
// ────────────────────────────────────────────────────────────────────────────
// Pre-join Stake Selection Modal for Rock Paper Scissors.
// Conforms strictly to XOET UI Quality Standard (Rules U1-U15).
// ────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { BET_TIERS } from "../../lib/rps/rpsEngine";

type RpsBetSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  onOpenFriendMatch?: (stake?: any) => void;
  userBalance?: number;
  language?: string;
  defaultAmount?: number;
};

export default function RpsBetSelectModal({
  visible,
  onClose,
  onConfirm,
  userBalance = 0,
  language = "en",
  defaultAmount = 10,
}: RpsBetSelectModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(defaultAmount);
  const isAmharic = language === "am";

  const handleSelectPreset = (amount: number) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    setSelectedAmount(amount);
  };

  const isAffordable = userBalance >= selectedAmount && selectedAmount >= 10;

  const handleConfirm = () => {
    if (!isAffordable) return;
    haptics.impact();
    onConfirm(selectedAmount);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleGroup}>
              <View style={s.iconBadge}>
                <Ionicons name="game-controller-outline" size={18} color="#00daf3" />
              </View>
              <View>
                <Text style={s.modalTitle}>
                  {isAmharic ? "ድንጋይ ወረቀት መቀስ" : "Rock Paper Scissors"}
                </Text>
                <Text style={s.modalSubtitle}>
                  {isAmharic ? "የውርርድ መጠን ይምረጡ" : "Select stake to find match"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Balance Bar */}
          <View style={s.balanceBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="wallet-outline" size={15} color="#00daf3" />
              <Text style={s.balanceLabel}>{isAmharic ? "ቀሪ ሂሳብ" : "Wallet balance"}:</Text>
            </View>
            <Text style={s.balanceValue}>{userBalance.toLocaleString()} ETB</Text>
          </View>

          {/* 4 Clean Preset Buttons (10, 25, 50, 100 ETB) */}
          <View
            style={s.presetsGrid}
            accessibilityRole="radiogroup"
            aria-label={isAmharic ? "የውርርድ መጠን አማራጮች" : "Stake preset options"}
          >
            {BET_TIERS.map((preset) => {
              const isSelected = selectedAmount === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => handleSelectPreset(preset)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={[
                    s.presetChip,
                    isSelected && s.presetChipActive,
                  ]}
                >
                  <Text style={[s.presetText, isSelected && s.presetTextActive]}>
                    {preset} ETB
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stake Detail (Single plain line, no fake client rake math) */}
          <View style={s.payoutRow}>
            <Text style={s.payoutLabel}>{isAmharic ? "የተመረጠ ውርርድ:" : "Selected stake:"}</Text>
            <Text style={s.payoutValue}>{selectedAmount} ETB</Text>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[
              s.confirmBtn,
              !isAffordable ? s.confirmBtnDisabled : s.confirmBtnActive,
            ]}
            activeOpacity={0.88}
            disabled={!isAffordable}
            accessibilityRole="button"
            accessibilityLabel={isAffordable ? `Find opponent for ${selectedAmount} ETB` : "Insufficient balance"}
          >
            <Text style={[s.confirmText, !isAffordable && { color: "#64748b" }]}>
              {!isAffordable
                ? (isAmharic ? "ቀሪ ሂሳብ አነስተኛ ነው" : "Insufficient balance")
                : (isAmharic ? `ተጋጣሚ ፈልግ (${selectedAmount} ETB)` : `Find opponent (${selectedAmount} ETB)`)}
            </Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 999999,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0d1326",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.25)",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  balanceLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#00daf3",
    fontSize: 13,
    fontWeight: "800",
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipActive: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    borderColor: "#00daf3",
  },
  presetText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "700",
  },
  presetTextActive: {
    color: "#00daf3",
    fontWeight: "800",
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 16,
  },
  payoutLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
  },
  payoutValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnActive: {
    backgroundColor: "#00daf3",
  },
  confirmBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  confirmText: {
    color: "#05070e",
    fontSize: 14,
    fontWeight: "800",
  },
});
