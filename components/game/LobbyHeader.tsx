import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, G } from "react-native-svg";

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
  const decimalPart = (balance % 1).toFixed(2).slice(1); // e.g. ".50" or ".00"

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* ── Top Bar: Avatar + Username + VIP Badge | APP, Lang, Notifications ── */}
      <View style={styles.headerTop}>
        {/* Left: User Profile Pill */}
        <TouchableOpacity
          onPress={() => goReplace("/(authed)/home/account")}
          activeOpacity={0.85}
          style={styles.avatarButton}
        >
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={18} color="#e2e8f0" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              {isEN ? "WELCOME BACK" : "እንኳን ደህና መጡ"}
            </Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>
                {user?.username || "YaredDM"}
              </Text>
              {/* VIP Crown Badge */}
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>👑</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Right: APP Download + Language + Notification Bell */}
        <View style={styles.headerBtns}>
          {/* APP Download Pill Button */}
          {!isPwaInstalled && (
            <Animated.View style={{ transform: [{ scale: appPulseAnim }] }}>
              <TouchableOpacity
                onPress={handleAppDownload}
                activeOpacity={0.85}
                style={[
                  styles.downloadBtn,
                  deferredPrompt ? styles.downloadBtnActive : styles.downloadBtnDefault,
                ]}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={14}
                  color={deferredPrompt ? "#a78bfa" : "#c084fc"}
                />
                <Text style={styles.downloadText}>APP</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Language Toggle Button */}
          <TouchableOpacity
            onPress={handleLanguageToggle}
            activeOpacity={0.85}
            style={styles.actionBtn}
          >
            <Ionicons name="language-outline" size={18} color="#f1f5f9" />
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            onPress={() => {
              if (setNotificationsVisible) {
                setNotificationsVisible(true);
              } else {
                goReplace("/(authed)/notifications");
              }
            }}
            activeOpacity={0.85}
            style={styles.actionBtn}
          >
            <Ionicons name="notifications-outline" size={18} color="#f1f5f9" />
            {unreadCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Premium Total Balance Card (Glassmorphism + Wallet & Coins Graph) ── */}
      <View style={styles.balanceCardContainer}>
        <LinearGradient
          colors={["#120f26", "#0c0a1b", "#140e2d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardGradient}
        >
          {/* Subtle Ambient Purple Glow Background */}
          <View style={styles.cardGlowOverlay} pointerEvents="none" />

          {/* Top Label & Refresh Row */}
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceLabelWrap}>
              <Text style={styles.balanceCrossIcon}>⚡</Text>
              <Text style={styles.balanceLabel}>
                {isEN ? "TOTAL BALANCE" : "ጠቅላላ ሂሳብ"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRefreshProfile}
              activeOpacity={0.85}
              style={styles.refreshBtn}
            >
              <Ionicons name="reload-outline" size={13} color="#c084fc" />
              <Text style={styles.refreshText}>
                {isEN ? "Refresh" : "አድስ"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Middle Balance & Graphic Row */}
          <View style={styles.balanceMainRow}>
            {/* Left Column: Big Amount & Percentage Badge */}
            <View style={styles.balanceLeftCol}>
              <View style={styles.amountDisplayRow}>
                <Text style={styles.currencyPrefix}>ETB </Text>
                <Text style={styles.wholeAmount}>{wholeBalance}</Text>
                <Text style={styles.decimalAmount}>{decimalPart}</Text>
              </View>

              {/* +12.5% vs yesterday badge */}
              <View style={styles.changeBadge}>
                <Text style={styles.changeBadgeIcon}>▲</Text>
                <Text style={styles.changeBadgeText}>+12.5%</Text>
                <Text style={styles.changeBadgeSubText}>vs yesterday</Text>
              </View>
            </View>

            {/* Right Column: 3D Coins Stack + Wallet + Trend SVG */}
            <View style={styles.balanceRightGraphic}>
              <Svg width={110} height={70} viewBox="0 0 110 70">
                <Defs>
                  <SvgLinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <Stop offset="100%" stopColor="#c084fc" stopOpacity={1} />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#7c3aed" />
                    <Stop offset="100%" stopColor="#4c1d95" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#fde047" />
                    <Stop offset="50%" stopColor="#eab308" />
                    <Stop offset="100%" stopColor="#ca8a04" />
                  </SvgLinearGradient>
                </Defs>

                {/* Rising Trend Line Path */}
                <Path
                  d="M 5 50 Q 30 45, 50 30 T 95 10"
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* 3D Stack of Gold Coins */}
                <G transform="translate(62, 28)">
                  {/* Bottom Coin */}
                  <Rect x="0" y="24" width="22" height="7" rx="3.5" fill="#ca8a04" />
                  <Rect x="0" y="22" width="22" height="6" rx="3" fill="url(#goldCoinGrad)" />
                  {/* Middle Coin */}
                  <Rect x="0" y="16" width="22" height="7" rx="3.5" fill="#ca8a04" />
                  <Rect x="0" y="14" width="22" height="6" rx="3" fill="url(#goldCoinGrad)" />
                  {/* Top Coin */}
                  <Rect x="0" y="8" width="22" height="7" rx="3.5" fill="#ca8a04" />
                  <Rect x="0" y="6" width="22" height="6" rx="3" fill="url(#goldCoinGrad)" stroke="#fef08a" strokeWidth="0.5" />
                </G>

                <G transform="translate(80, 22)">
                  {/* Side Coin Stack */}
                  <Rect x="0" y="20" width="20" height="6" rx="3" fill="#ca8a04" />
                  <Rect x="0" y="18" width="20" height="5" rx="2.5" fill="url(#goldCoinGrad)" />
                  <Rect x="0" y="12" width="20" height="6" rx="3" fill="#ca8a04" />
                  <Rect x="0" y="10" width="20" height="5" rx="2.5" fill="url(#goldCoinGrad)" stroke="#fef08a" strokeWidth="0.5" />
                </G>

                {/* Leather Purple Wallet */}
                <G transform="translate(8, 12)">
                  <Rect x="15" y="12" width="38" height="28" rx="7" fill="url(#walletGrad)" stroke="#a78bfa" strokeWidth="1" />
                  <Rect x="15" y="10" width="38" height="6" rx="3" fill="#6d28d9" opacity={0.6} />
                  {/* Wallet Gold Clasp */}
                  <Circle cx="44" cy="26" r="3.5" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                </G>
              </Svg>
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
    gap: 8,
    marginBottom: 14,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(30, 27, 56, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    justifyContent: "center",
  },
  welcomeText: {
    color: "#8b93a7",
    fontSize: 9.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  usernameText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  vipBadge: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.4)",
  },
  vipBadgeText: {
    fontSize: 11,
  },
  headerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.2,
  },
  downloadBtnActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  downloadBtnDefault: {
    borderColor: "rgba(139, 92, 246, 0.3)",
    backgroundColor: "rgba(20, 16, 40, 0.7)",
  },
  downloadText: {
    color: "#c084fc",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(20, 16, 40, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  badgeDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#0c0a1b",
  },

  /* Balance Card */
  balanceCardContainer: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.25)",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceCardGradient: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: "relative",
  },
  cardGlowOverlay: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },
  balanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  balanceLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceCrossIcon: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "900",
  },
  balanceLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  refreshText: {
    color: "#c084fc",
    fontSize: 11,
    fontWeight: "700",
  },
  balanceMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLeftCol: {
    flex: 1,
  },
  amountDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currencyPrefix: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  wholeAmount: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  decimalAmount: {
    color: "#c084fc",
    fontSize: 18,
    fontWeight: "800",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  changeBadgeIcon: {
    color: "#22c55e",
    fontSize: 8,
  },
  changeBadgeText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "900",
  },
  changeBadgeSubText: {
    color: "#8b93a7",
    fontSize: 9.5,
    fontWeight: "600",
    marginLeft: 2,
  },
  balanceRightGraphic: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
