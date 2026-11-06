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
import { Notification01 } from "../animate-ui/icons/hugeicons/notification-01";
import { colors, type, radius, space, metrics, elevation } from "../../theme/tokens";
import { haptics } from "../../lib/haptcs";
import { playTickSound, playNotificationSound } from "../../lib/pinTickAudio";

interface LobbyHeaderProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  user: any;
  isEN: boolean;
  isPwaInstalled?: boolean;
  appPulseAnim?: Animated.Value;
  deferredPrompt?: any;
  handleAppDownload?: () => void;
  handleLanguageToggle: () => void;
  setNotificationsVisible?: (visible: boolean) => void;
  unreadCount: number;
  balance: number;
  handleRefreshProfile: () => void;
  goReplace: (path: string) => void;
  compactBalance?: boolean;
}

export const LobbyHeader = memo(function LobbyHeader({
  fadeAnim,
  slideAnim,
  user,
  isEN,
  handleLanguageToggle,
  setNotificationsVisible,
  unreadCount,
  balance,
  handleRefreshProfile,
  goReplace,
  compactBalance = false,
}: LobbyHeaderProps) {
  const wholeBalance = Math.floor(balance).toLocaleString();
  const decimalPart = (balance % 1).toFixed(2).slice(1); // ".50" | ".00"
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const [refreshToastVisible, setRefreshToastVisible] = React.useState(false);

  const handleRefreshClick = () => {
    haptics.tap();
    playTickSound();
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 650,
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished) {
        try { playNotificationSound(); } catch {}
        haptics.tap();
        setRefreshToastVisible(true);
        setTimeout(() => setRefreshToastVisible(false), 2400);
      }
    });
    handleRefreshProfile();
  };

  const spinDeg = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Identity row (Matching Image 1 & 2) ─────────────────────────────── */}
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => { haptics.tap(); playTickSound(); goReplace("/(authed)/home/account"); }}
          activeOpacity={0.8}
          style={styles.avatarButton}
        >
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={19} color="#00daf3" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              {isEN ? "WELCOME BACK" : "እንኳን ደህና መጡ"}
            </Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText} numberOfLines={1}>
                {user?.username || "Player"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Top Right: Only Language & Notification Bell (No App download button) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Language Toggle Pill */}
          <TouchableOpacity
            onPress={() => { haptics.tap(); playTickSound(); handleLanguageToggle(); }}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <Ionicons name="globe-outline" size={14} color="#94a3b8" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>
              {isEN ? "EN" : "AM"}
            </Text>
            <Ionicons name="chevron-down" size={11} color="#94a3b8" />
          </TouchableOpacity>

          {/* Notification Bell */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <Notification01
              size={18}
              color="#ffffff"
              animateOnHover
              unreadCount={unreadCount}
              onPress={() => {
                if (setNotificationsVisible) setNotificationsVisible(true);
                else goReplace("/(authed)/notifications");
              }}
            />
          </View>
        </View>
      </View>

      {/* ── Balance display: Compact bar or full card ──────────────────── */}
      {compactBalance ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleRefreshClick}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#111625",
            borderRadius: 20,
            borderWidth: 1.2,
            borderColor: "rgba(0, 218, 243, 0.22)",
            paddingHorizontal: 16,
            paddingVertical: 14,
            minHeight: 72,
            marginTop: 4,
            marginBottom: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(0, 218, 243, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(0, 218, 243, 0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="wallet" size={21} color="#00daf3" />
            </View>
            <View>
              <Text style={{ color: "#8b93a7", fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>
                {isEN ? "TOTAL BALANCE" : "ጠቅላላ ሂሳብ"}
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                ETB {wholeBalance}<Text style={{ color: "#f5b642", fontSize: 15.5 }}>{decimalPart}</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRefreshClick}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(0, 218, 243, 0.10)",
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(0, 218, 243, 0.35)",
            }}
          >
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="refresh" size={14} color="#00daf3" />
            </Animated.View>
            <Text style={{ color: "#00daf3", fontSize: 12, fontWeight: "800" }}>
              {isEN ? "Refresh" : "አድስ"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>) : (
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
      )}
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
