// components/game/RpsBetSelectModal.tsx
// ────────────────────────────────────────────────────────────────────────────
// Pre-join Stake & Bet Amount Selection Popup Modal for Rock Paper Scissors.
// Replaces full-page foreign lobbies with a clean, native-feeling modal.
// ────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { haptics } from "../../lib/haptics";
import { playTickSound } from "../../lib/pinTickAudio";
import { BET_TIERS, calculatePrize } from "../../lib/rps/rpsEngine";

type RpsBetSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  onOpenFriendMatch?: (amount: number) => void;
  userBalance?: number;
  language?: string;
  defaultAmount?: number;
};

export default function RpsBetSelectModal({
  visible,
  onClose,
  onConfirm,
  onOpenFriendMatch,
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

  const handleStep = (delta: number) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    setSelectedAmount((prev) => Math.max(10, Math.min(1000, prev + delta)));
  };

  // Validation & Prize calculations (20% fee, 16 ETB winner payout on 10 ETB stake)
  const remainingBalance = userBalance - selectedAmount;
  const isAffordable = userBalance >= selectedAmount && selectedAmount >= 10;
  const { pot, fee, prize } = calculatePrize(selectedAmount);

  const handleConfirm = () => {
    if (!isAffordable) return;
    haptics.impact();
    onConfirm(selectedAmount);
    onClose();
  };

  const handleFriendClick = () => {
    haptics.tap();
    onClose();
    onOpenFriendMatch?.(selectedAmount);
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
                <FontAwesome5 name="hand-scissors" size={17} color="#F59E0B" />
              </View>
              <View>
                <Text style={s.modalTitle}>
                  {isAmharic ? "ድንጋይ ወረቀት መቀስ" : "ROCK PAPER SCISSORS"}
                </Text>
                <Text style={s.modalSubtitle}>
                  {isAmharic ? "የውርርድ መጠን ይምረጡ" : "Select stake to find match"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Balance Bar */}
          <View style={s.balanceBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="wallet-outline" size={15} color="#F59E0B" />
              <Text style={s.balanceLabel}>{isAmharic ? "ቀሪ ሂሳብ" : "Wallet Balance"}:</Text>
            </View>
            <Text style={s.balanceValue}>{userBalance.toLocaleString()} ETB</Text>
          </View>

          {/* Amount Stepper & Direct Editable Numeric Input */}
          <View style={s.stepperRow}>
            <TouchableOpacity
              onPress={() => handleStep(-10)}
              style={s.stepBtn}
              activeOpacity={0.7}
              disabled={selectedAmount <= 10}
            >
              <Ionicons name="remove" size={20} color={selectedAmount <= 10 ? "#475569" : "#FFFFFF"} />
            </TouchableOpacity>

            <View style={s.amountDisplay}>
              <TextInput
                value={String(selectedAmount)}
                onChangeText={(txt) => {
                  const clean = txt.replace(/[^0-9]/g, "");
                  const num = clean ? parseInt(clean, 10) : 0;
                  setSelectedAmount(num);
                }}
                keyboardType="numeric"
                style={s.amountInput}
                selectTextOnFocus
              />
              <Text style={s.amountCurrency}>ETB</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleStep(10)}
              style={s.stepBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 4 Clean Preset Buttons */}
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

          {/* Payout & Pot Breakdown Table */}
          <View style={s.breakdownCard}>
            <View style={s.breakdownRow}>
              <Text style={s.breakdownLabel}>{isAmharic ? "ጠቅላላ ሽልማት" : "Total Match Pot (2x)"}</Text>
              <Text style={s.breakdownValue}>{pot} ETB</Text>
            </View>
            <View style={s.breakdownRow}>
              <Text style={s.breakdownLabel}>{isAmharic ? "የፕላትፎርም ክፍያ" : "Platform Fee (20%)"}</Text>
              <Text style={s.breakdownValueMuted}>-{fee} ETB</Text>
            </View>
            <View style={[s.breakdownRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)" }]}>
              <Text style={[s.breakdownLabel, { color: "#F59E0B", fontWeight: "700" }]}>
                {isAmharic ? "የአሸናፊ ክፍያ" : "Winner Takes"}
              </Text>
              <Text style={s.prizeHighlight}>+{prize} ETB</Text>
            </View>
          </View>

          {/* Balance Validation */}
          <View style={s.validationRow}>
            <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "600" }}>
              {isAmharic ? "ከተቀላቀሉ በኋላ የሚቀር" : "Balance after match"}:
            </Text>
            <Text style={{
              color: isAffordable ? "#10B981" : "#EF4444",
              fontSize: 12,
              fontWeight: "800",
            }}>
              {isAffordable ? `${remainingBalance.toLocaleString()} ETB` : (isAmharic ? "ያልበቃ ቀሪ ሂሳብ" : "Insufficient")}
            </Text>
          </View>

          {/* Primary Action Button: [ FIND OPPONENT · 10 ETB ] */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[s.confirmBtn, !isAffordable && { opacity: 0.55 }]}
            activeOpacity={0.88}
            disabled={!isAffordable}
          >
            <LinearGradient
              colors={isAffordable ? ["#F59E0B", "#D97706"] : ["#475569", "#334155"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.confirmGrad}
            >
              <MaterialCommunityIcons name={isAffordable ? "sword-cross" : "alert-circle"} size={18} color="#080F17" />
              <Text style={s.confirmText}>
                {!isAffordable
                  ? (isAmharic ? "ቀሪ ሂሳብ አነስተኛ ነው" : "INSUFFICIENT BALANCE")
                  : (isAmharic ? `ተጋጣሚ ፈልግ · ${selectedAmount} ETB` : `FIND OPPONENT · ${selectedAmount} ETB`)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Action: Play With Friend */}
          {onOpenFriendMatch && (
            <TouchableOpacity
              onPress={handleFriendClick}
              style={s.friendBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={16} color="#00DAF3" />
              <Text style={s.friendBtnText}>
                {isAmharic ? "ከጓደኛ ጋር ተጫወት" : "PLAY WITH FRIEND"}
              </Text>
            </TouchableOpacity>
          )}

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
    maxWidth: 440,
    backgroundColor: "#0d1527",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: "0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(245, 158, 11, 0.15)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.65,
        shadowRadius: 24,
        elevation: 16,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  modalSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
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
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  balanceLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Space Grotesk, monospace",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  amountDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
  },
  amountInput: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    minWidth: 60,
    padding: 0,
    fontFamily: "Space Grotesk, sans-serif",
  },
  amountCurrency: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },
  presetsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipActive: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: "#F59E0B",
  },
  presetText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  presetTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  breakdownCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  breakdownValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownValueMuted: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  prizeHighlight: {
    color: "#F59E0B",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  confirmBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  confirmGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  confirmText: {
    color: "#080F17",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  friendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(0, 218, 243, 0.35)",
    backgroundColor: "rgba(0, 218, 243, 0.06)",
  },
  friendBtnText: {
    color: "#00DAF3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
