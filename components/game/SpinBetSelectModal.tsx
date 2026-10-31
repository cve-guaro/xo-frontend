// components/game/SpinBetSelectModal.tsx
// ────────────────────────────────────────────────────────────────────────────
// Pre-join Stake & Bet Amount Selection Modal for Real Spin.
// Allows users to choose bet tier (10, 25, 50, 100, 200, 500 ETB) or custom
// amount before joining the live multiplayer spin wheel.
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { haptics } from "../../lib/haptics";
import { playTickSound } from "../../lib/pinTickAudio";

const STAKE_PRESETS = [10, 25, 50, 100, 200, 500];

type SpinBetSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  userBalance?: number;
  language?: string;
  defaultAmount?: number;
};

export default function SpinBetSelectModal({
  visible,
  onClose,
  onConfirm,
  userBalance = 0,
  language = "en",
  defaultAmount = 100,
}: SpinBetSelectModalProps) {
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
    setSelectedAmount(prev => Math.max(10, Math.min(10000, prev + delta)));
  };

  // Validation and balance calculations
  const remainingBalance = userBalance - selectedAmount;
  const isAffordable = userBalance >= selectedAmount && selectedAmount >= 10;

  const handleConfirm = () => {
    if (!isAffordable) return;
    haptics.impact();
    onConfirm(selectedAmount);
    onClose();
  };

  // 20% platform rake per xoet-platform rules (Room prize calculation)
  const estimatedPot = selectedAmount * 5;
  const estimatedNetPrize = Math.floor(estimatedPot * 0.8);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={e => e.stopPropagation()}>
          
          {/* Header (Clean, No Subtitle per User Request) */}
          <View style={s.headerRow}>
            <View style={s.headerTitleGroup}>
              <View style={s.iconBadge}>
                <Ionicons name="flame" size={18} color="#FF1744" />
              </View>
              <Text style={s.modalTitle}>
                {isAmharic ? "የውርርድ መጠን ይምረጡ" : "CHOOSE YOUR STAKE"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Balance Bar (Red/Crimson themed, no blue/yellow) */}
          <View style={s.balanceBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="wallet-outline" size={15} color="#FF1744" />
              <Text style={s.balanceLabel}>{isAmharic ? "ቀሪ ሂሳብ" : "Wallet Balance"}:</Text>
            </View>
            <Text style={s.balanceValue}>{userBalance.toLocaleString()} ETB</Text>
          </View>

          {/* Amount Stepper & Direct Editable Numeric Input (Per User Request) */}
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

          {/* 4 Clean Suggestion Amount Buttons as Radio Group with Floating Animation */}
          <View
            style={s.presetsGrid}
            accessibilityRole="radiogroup"
            aria-label={isAmharic ? "የውርርድ መጠን አማራጮች" : "Stake preset options"}
          >
            {[25, 50, 100, 250].map((preset) => {
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

          {/* Balance After Joining + Validation */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginBottom: 8,
          }}>
            <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "600" }}>
              {isAmharic ? "ከተቀላቀሉ በኋላ የሚቀር" : "Balance after joining"}:
            </Text>
            <Text style={{
              color: isAffordable ? "#10B981" : "#EF4444",
              fontSize: 12,
              fontWeight: "800",
            }}>
              {isAffordable ? `${remainingBalance.toLocaleString()} ETB` : (isAmharic ? "ያልበቃ ቀሪ ሂሳብ" : "Insufficient")}
            </Text>
          </View>

          {/* Action Button: [ JOIN ROOM · 100 ETB ] */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[s.confirmBtn, !isAffordable && { opacity: 0.55 }]}
            activeOpacity={0.88}
            disabled={!isAffordable}
          >
            <LinearGradient
              colors={isAffordable ? ["#DC2626", "#991B1B"] : ["#475569", "#334155"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.confirmGrad}
            >
              <Ionicons name={isAffordable ? "play" : "alert-circle"} size={16} color="#FFFFFF" />
              <Text style={s.confirmText}>
                {!isAffordable
                  ? (isAmharic ? "ቀሪ ሂሳብ አነስተኛ ነው" : "INSUFFICIENT BALANCE")
                  : (isAmharic ? `ተቀላቀል · ${selectedAmount} ETB` : `JOIN ROOM · ${selectedAmount} ETB`)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
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
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: "0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)",
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
    backgroundColor: "rgba(255, 23, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 23, 68, 0.4)",
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
    borderColor: "rgba(255, 23, 68, 0.25)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  balanceLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
    marginTop: 14,
  },
  presetChip: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipActive: {
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    borderColor: "#FF1744",
    borderWidth: 2,
    transform: [{ translateY: -3 }],
    ...Platform.select({
      web: {
        boxShadow: "0 6px 14px rgba(255, 23, 68, 0.35)",
      },
      default: {
        shadowColor: "#FF1744",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  presetText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  presetTextActive: {
    color: "#FF1744",
    fontWeight: "900",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 23, 68, 0.3)",
    padding: 4,
    marginBottom: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  amountDisplay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  amountInput: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "Space Grotesk, Inter, sans-serif",
    textAlign: "center",
    minWidth: 70,
    padding: 0,
    margin: 0,
  },
  amountValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  amountCurrency: {
    color: "#FF1744",
    fontSize: 14,
    fontWeight: "900",
  },
  quickIncrementRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  quickIncBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  quickIncText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
  },
  previewCard: {
    backgroundColor: "rgba(10, 16, 32, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.25)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    gap: 4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  previewPot: {
    color: "#F5B642",
    fontSize: 12,
    fontWeight: "800",
  },
  previewPrize: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "900",
  },
  confirmBtn: {
    height: 48,
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmGrad: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
});
