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

  const rawName = user?.display_name || user?.username || "Guest 5";
  const displayName = rawName.toLowerCase().includes("(admin)") ? rawName : `${rawName}${roleTag}`;
  const usernameDisplay = user?.username ? `${user.username}` : "guest_1";

  return (
    <View style={[s.header, isCompact && s.headerCompact]}>
      {/* ──────────────── 1. LEFT: Live Wallet Balance Pill with Wallet Icon ──────────────── */}
      <View style={s.leftSection}>
        <TouchableOpacity
          onPress={() => setWalletMenuVisible(true)}
          style={s.balancePill}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open Wallet Menu"
        >
          <Text style={s.balanceAmount}>
            ETB {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <View style={s.walletBtn}>
            <Ionicons name="wallet" size={15} color="#0D1117" />
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
            accessibilityLabel="Switch Language"
          >
            <Ionicons name="globe-outline" size={15} color="#8893A7" style={{ marginRight: 5 }} />
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
          <Ionicons name="notifications" size={17} color="#8893A7" />
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
          accessibilityLabel="Download App"
        >
          <Ionicons name="download-outline" size={17} color="#8893A7" />
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
          accessibilityLabel="View Profile"
        >
          <View style={s.avatarWrap}>
            <Avatar
              uri={user?.avatar}
              name={user?.display_name || user?.username || "G"}
              size={34}
              showOnlineDot={true}
            />
          </View>
          {!isCompact && (
            <View style={s.profileTextCol}>
              <Text style={s.profileDisplayName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={s.usernameRow}>
                <View style={s.miniGreenDot} />
                <Text style={s.profileUsername} numberOfLines={1}>
                  {usernameDisplay}
                </Text>
              </View>
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
                <Text style={s.walletModalKicker}>WALLET ACTIONS</Text>
                <Text style={s.walletModalBalance}>
                  ETB {displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setWalletMenuVisible(false)}
                style={s.walletModalCloseBtn}
              >
                <Ionicons name="close" size={18} color="#8893A7" />
              </TouchableOpacity>
            </View>

            {/* Wallet Action Options */}
            <View style={s.walletActionsList}>
              {/* Option 1: DEPOSIT */}
              <TouchableOpacity
                onPress={() => handleWalletAction("deposit")}
                style={s.walletActionRow}
                activeOpacity={0.85}
              >
                <View style={[s.walletActionIconBox, { backgroundColor: "rgba(0, 218, 243, 0.15)", borderColor: "rgba(0, 218, 243, 0.4)" }]}>
                  <Ionicons name="arrow-down-circle" size={24} color="#00DAF3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.walletActionTitle}>Deposit Funds</Text>
                  <Text style={s.walletActionSubtitle}>Instant top-up via Chapa & Telebirr</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#00DAF3" />
              </TouchableOpacity>

              {/* Option 2: WITHDRAW */}
              <TouchableOpacity
                onPress={() => handleWalletAction("withdraw")}
                style={s.walletActionRow}
                activeOpacity={0.85}
              >
                <View style={[s.walletActionIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.4)" }]}>
                  <Ionicons name="arrow-up-circle" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.walletActionTitle}>Withdraw Funds</Text>
                  <Text style={s.walletActionSubtitle}>Fast payout to your bank or phone account</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#10B981" />
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
    backgroundColor: "#060613",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 218, 243, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 50,
  },
  headerCompact: {
    paddingHorizontal: 12,
  },

  // 1. Left Section
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  balancePill: {
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 18,
    height: 38,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceAmount: {
    color: "#F4F4F6",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  walletBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00A2E8",
    alignItems: "center",
    justifyContent: "center",
  },

  // 2. Right Controls
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  languageButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  languageText: {
    color: "#F4F4F6",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    marginLeft: 4,
  },
  avatarWrap: {
    position: "relative",
  },
  profileTextCol: {
    maxWidth: 140,
  },
  profileDisplayName: {
    color: "#F4F4F6",
    fontSize: 12,
    fontWeight: "800",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  miniGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  profileUsername: {
    color: "#8893A7",
    fontSize: 10,
    fontWeight: "600",
  },

  // 3. Wallet Modal
  walletModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 15, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
  },
  walletModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0D1320",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.2)",
    padding: 20,
    gap: 18,
  },
  walletModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 14,
  },
  walletModalKicker: {
    color: "#8893A7",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  walletModalBalance: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  walletModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletActionsList: {
    gap: 10,
  },
  walletActionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    gap: 12,
  },
  walletActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  walletActionTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  walletActionSubtitle: {
    color: "#8893A7",
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
});
