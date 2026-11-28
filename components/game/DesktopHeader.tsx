// components/game/DesktopHeader.tsx
// Unified desktop header for XOET gaming platform.
// Strictly matches the updated responsive architecture:
// - Left: Live ETB Wallet balance + Wallet Actions Menu trigger (DEPOSIT & WITHDRAW)
// - Right: Language switcher, Notifications bell, App Download, and User profile chip
// - Clean, unconstrained horizontal spacing that never feels cramped on resize
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { colors, radius, space } from "../../theme/tokens";
import Avatar from "../ui/Avatar";

export type DesktopTabType = "SPIN" | "XO_GAME" | "RPS" | "COMING_SOON";

interface DesktopHeaderProps {
  user: any;
  balance?: number;
  setDepositVisible?: (v: boolean) => void;
  setWithdrawVisible?: (v: boolean) => void;
  language?: string;
  handleLanguageToggle?: () => void;
  selectedTab?: DesktopTabType;
  onSelectTab?: (tab: DesktopTabType) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  setPwaModalVisible?: (v: boolean) => void;
  bgMusicPlaying?: boolean;
  onToggleSound?: () => void;
  unreadCount?: number;
  setNotificationsVisible?: (v: boolean) => void;
  router: any;
}

export default function DesktopHeader({
  user,
  balance,
  setDepositVisible,
  setWithdrawVisible,
  language = "en",
  handleLanguageToggle,
  setPwaModalVisible = () => {},
  unreadCount = 0,
  setNotificationsVisible = () => {},
  router,
}: DesktopHeaderProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 1100;

  // Wallet action modal state
  const [walletMenuVisible, setWalletMenuVisible] = useState(false);

  const displayBalance =
    balance !== undefined
      ? balance
      : Number(user?.available_balance || 0);

  const handleWalletAction = (action: "deposit" | "withdraw") => {
    setWalletMenuVisible(false);
    try {
      playTickSound();
    } catch {}
    haptics.tap();

    if (action === "deposit") {
      if (setDepositVisible) setDepositVisible(true);
      else router.push("/(authed)/deposit");
    } else {
      if (setWithdrawVisible) setWithdrawVisible(true);
      else router.push("/(authed)/withdraw");
    }
  };

  const roleTag =
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.is_superadmin ||
    (user as any)?.is_admin
      ? " (Admin)"
      : "";

  const rawName = user?.display_name || user?.username || "Player";
  const displayName = rawName.toLowerCase().includes("(admin)") ? rawName : `${rawName}${roleTag}`;
  const usernameDisplay = user?.username ? `@${user.username}` : "";

  return (
    <View style={[s.header, isCompact && s.headerCompact]}>
      {/* ──────────────── 1. LEFT: Live Wallet Balance Pill with Wallet Icon ──────────────── */}
      <View style={s.leftSection}>
        <TouchableOpacity
          onPress={() => setWalletMenuVisible(true)}
          style={s.balancePill}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open wallet menu"
        >
          <Text style={s.balanceAmount}>
            {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ETB
          </Text>
          <View style={s.walletBtn}>
            <Ionicons name="wallet" size={16} color={colors.bgDeep} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ──────────────── 2. RIGHT CONTROLS: Language, Bell, Download, Profile ──────────────── */}
      <View style={s.rightControls}>
        {/* Language Switcher Button */}
        {handleLanguageToggle && (
          <TouchableOpacity
            onPress={() => {
              try {
                playTickSound();
              } catch {}
              haptics.tap();
              handleLanguageToggle();
            }}
            style={s.languageButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Switch language"
          >
            <Ionicons name="globe-outline" size={16} color={colors.textMuted} style={{ marginRight: space.xs }} />
            <Text style={s.languageText}>
              {language === "am" ? "አማ" : "EN"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={() => {
            try {
              playTickSound();
            } catch {}
            haptics.tap();
            setNotificationsVisible(true);
          }}
          style={s.iconButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications" size={18} color={colors.textMuted} />
          {unreadCount > 0 && <View style={s.unreadDot} />}
        </TouchableOpacity>

        {/* Download PWA/App Action */}
        <TouchableOpacity
          onPress={() => {
            try {
              playTickSound();
            } catch {}
            haptics.tap();
            setPwaModalVisible(true);
          }}
          style={s.iconButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Download app"
        >
          <Ionicons name="download-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* User Profile Pill */}
        <TouchableOpacity
          onPress={() => {
            try {
              playTickSound();
            } catch {}
            haptics.tap();
            router.push("/(authed)/home/account");
          }}
          style={s.profilePill}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View profile"
        >
          <View style={s.avatarWrap}>
            <Avatar
              uri={user?.avatar}
              name={user?.display_name || user?.username || "P"}
              size={34}
              showOnlineDot={true}
            />
          </View>
          {!isCompact && (
            <View style={s.profileTextCol}>
              <Text style={s.profileDisplayName} numberOfLines={1}>
                {displayName}
              </Text>
              {!!usernameDisplay && (
                <View style={s.usernameRow}>
                  <View style={s.miniGreenDot} />
                  <Text style={s.profileUsername} numberOfLines={1}>
                    {usernameDisplay}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ──────────────── WALLET ACTIONS MODAL (DEPOSIT & WITHDRAW) ──────────────── */}
      <Modal
        visible={walletMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWalletMenuVisible(false)}
      >
        <Pressable
          style={s.walletModalOverlay}
          onPress={() => setWalletMenuVisible(false)}
        >
          <Pressable style={s.walletModalCard} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={s.walletModalHeader}>
              <View>
                <Text style={s.walletModalKicker}>Wallet actions</Text>
                <Text style={s.walletModalBalance}>
                  {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWalletMenuVisible(false)}
                style={s.walletModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close wallet menu"
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Wallet Action Options */}
            <View style={s.walletActionsList}>
              {/* Option 1: DEPOSIT */}
              <TouchableOpacity
                onPress={() => handleWalletAction("deposit")}
                style={s.walletActionRow}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Deposit funds"
              >
                <View style={[s.walletActionIconBox, { backgroundColor: colors.tintPrimary, borderColor: colors.primary }]}>
                  <Ionicons name="arrow-down-circle" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.walletActionTitle}>Deposit funds</Text>
                  <Text style={s.walletActionSubtitle}>Top up via Chapa or Telebirr</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Option 2: WITHDRAW */}
              <TouchableOpacity
                onPress={() => handleWalletAction("withdraw")}
                style={s.walletActionRow}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Withdraw funds"
              >
                <View style={[s.walletActionIconBox, { backgroundColor: colors.tintSuccess, borderColor: colors.success }]}>
                  <Ionicons name="arrow-up-circle" size={24} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.walletActionTitle}>Withdraw funds</Text>
                  <Text style={s.walletActionSubtitle}>Payout to your bank or phone account</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.success} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    zIndex: 50,
  },
  headerCompact: {
    paddingHorizontal: space.md,
  },

  // 1. Left Section
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  balancePill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    minHeight: 44,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  balanceAmount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  walletBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // 2. Right Controls
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  languageButton: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  languageText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 44,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    marginLeft: space.xs,
  },
  avatarWrap: {
    position: "relative",
  },
  profileTextCol: {
    maxWidth: 140,
  },
  profileDisplayName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: 2,
  },
  miniGreenDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  profileUsername: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  // 3. Wallet Modal
  walletModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 15, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.xl,
    zIndex: 9999,
  },
  walletModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: space.xl,
    gap: space.lg,
  },
  walletModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: space.md,
  },
  walletModalKicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  walletModalBalance: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: space.xs,
  },
  walletModalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.cardRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  walletActionsList: {
    gap: space.md,
  },
  walletActionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.md,
  },
  walletActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  walletActionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  walletActionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
