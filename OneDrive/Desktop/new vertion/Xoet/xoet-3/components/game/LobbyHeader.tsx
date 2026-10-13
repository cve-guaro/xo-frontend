// components/game/LobbyHeader.tsx
// ────────────────────────────────────────────────────────────────────────────
// Lobby header: identity row + balance card.
// Design notes (production pass):
//  - One accent per zone: cyan = brand/identity, gold = money.
//  - Balance card is a calm data surface — flat gradient, hairline border,
//    structured typography (currency < amount < decimals), live delta badge.
// ────────────────────────────────────────────────────────────────────────────
import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, type, radius, space, metrics, elevation } from "../../theme/tokens";

interface LobbyHeaderProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  user: any;
  isEN: boolean;
  isPwaInstalled: boolean;
  appPulseAnim: Animated.Value;
  deferredPrompt: any;
  handleAppDownload: () => void;
  handleLanguageToggle: () => void;
  setNotificationsVisible?: (visible: boolean) => void;
  unreadCount: number;
  balance: number;
  handleRefreshProfile: () => void;
  goReplace: (path: string) => void;
}

export const LobbyHeader = memo(function LobbyHeader({
  fadeAnim,
  slideAnim,
  user,
  isEN,
  isPwaInstalled,
  appPulseAnim,
  deferredPrompt,
  handleAppDownload,
  handleLanguageToggle,
  setNotificationsVisible,
  unreadCount,
  balance,
  handleRefreshProfile,
  goReplace,
}: LobbyHeaderProps) {
  const wholeBalance = Math.floor(balance).toLocaleString();
  const decimalPart = (balance % 1).toFixed(2).slice(1); // ".50" | ".00"

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Identity row ─────────────────────────────────────────────── */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => goReplace("/(authed)/home/account")}
          activeOpacity={0.8}
          style={styles.avatarButton}
        >
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={19} color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              {isEN ? "WELCOME BACK" : "እንኳን ደህና መጡ"}
            </Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText} numberOfLines={1}>
                {user?.username || "Player"}
              </Text>
              <View style={styles.vipBadge}>
                <Ionicons name="ribbon" size={10} color={colors.gold} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerBtns}>
          {!isPwaInstalled && (
            <Animated.View style={{ transform: [{ scale: appPulseAnim }] }}>
              <TouchableOpacity
                onPress={handleAppDownload}
                activeOpacity={0.8}
                style={[
                  styles.downloadBtn,
                  deferredPrompt ? styles.downloadBtnActive : styles.downloadBtnDefault,
                ]}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={13}
                  color={colors.violetSoft}
                />
                <Text style={styles.downloadText}>APP</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <TouchableOpacity
            onPress={handleLanguageToggle}
            activeOpacity={0.8}
            style={styles.actionBtn}
          >
            <Ionicons name="language-outline" size={17} color={colors.textSoft} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (setNotificationsVisible) setNotificationsVisible(true);
              else goReplace("/(authed)/notifications");
            }}
            activeOpacity={0.8}
            style={styles.actionBtn}
          >
            <Ionicons name="notifications-outline" size={17} color={colors.textSoft} />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Balance card: calm data surface ──────────────────────────── */}
      <View style={styles.balanceCardContainer}>
        <LinearGradient
          colors={colors.gradCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardGradient}
        >
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceLabelWrap}>
              <Ionicons name="wallet-outline" size={14} color={colors.textMuted} />
              <Text style={styles.balanceLabel}>
                {isEN ? "TOTAL BALANCE" : "ጠቅላላ ሂሳብ"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRefreshProfile}
              activeOpacity={0.8}
              style={styles.refreshBtn}
            >
              <Ionicons name="refresh" size={12} color={colors.textMuted} />
              <Text style={styles.refreshText}>{isEN ? "Refresh" : "አድስ"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.balanceMainRow}>
            <View style={styles.balanceLeftCol}>
              <View style={styles.amountDisplayRow}>
                <Text style={styles.currencyPrefix}>ETB</Text>
                <Text style={styles.wholeAmount}>{wholeBalance}</Text>
                <Text style={styles.decimalAmount}>{decimalPart}</Text>
              </View>

              <View style={styles.changeBadge}>
                <Ionicons name="caret-up" size={9} color={colors.successSoft} />
                <Text style={styles.changeBadgeText}>+12.5%</Text>
                <Text style={styles.changeBadgeSubText}>vs yesterday</Text>
              </View>
            </View>

            <View style={styles.walletArtWrap}>
              <Image
                source={require("../../assets/images/3d-wallet.png")}
                style={styles.walletArt}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: Platform.OS === "ios" ? 4 : 8,
    marginBottom: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    marginBottom: space.md,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flexShrink: 1,
  },
  avatarWrap: {
    width: metrics.avatarSize,
    height: metrics.avatarSize,
    borderRadius: metrics.avatarSize / 2,
    backgroundColor: colors.tintPrimary,
    borderWidth: 1.5,
    borderColor: "rgba(0,218,243,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { justifyContent: "center" },
  welcomeText: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  usernameText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  vipBadge: {
    backgroundColor: colors.tintGold,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(245,182,66,0.4)",
  },
  headerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  downloadBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  downloadBtnActive: {
    borderColor: "rgba(139,92,246,0.55)",
    backgroundColor: colors.tintViolet,
  },
  downloadBtnDefault: {
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  downloadText: {
    color: colors.violetSoft,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
  },

  /* Balance card */
  balanceCardContainer: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceCardGradient: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  balanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  balanceLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceLabel: {
    color: colors.textMuted,
    ...type.micro,
    textTransform: "uppercase",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  balanceMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLeftCol: { flex: 1 },
  amountDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  currencyPrefix: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  wholeAmount: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  decimalAmount: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: "800",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tintSuccess,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  changeBadgeText: {
    color: colors.successSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  changeBadgeSubText: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: "600",
  },
  walletArtWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 2,
  },
  walletArt: {
    width: 108,
    height: 90,
    resizeMode: "contain",
  },
});
