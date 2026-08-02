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
      {/* ── Top Bar: Avatar + Username + VIP Ribbon | APP, Lang, Notifications ── */}
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
              {/* VIP Ribbon Badge */}
              <View style={styles.vipBadge}>
                <Ionicons name="ribbon-outline" size={11} color="#f5b642" />
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

      {/* ── Sleek Total Balance Card (Flat Clean Dark Glass - No Heavy Shadows or 3D Graphics) ── */}
      <View style={styles.balanceCardContainer}>
        <LinearGradient
          colors={["#120f26", "#0c0a1b", "#140e2d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardGradient}
        >
          {/* Top Label & Refresh Row */}
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceLabelWrap}>
              <Ionicons name="wallet-outline" size={15} color="#c084fc" />
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

          {/* Middle Balance Row */}
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
                <Ionicons name="caret-up" size={10} color="#22c55e" />
                <Text style={styles.changeBadgeText}>+12.5%</Text>
                <Text style={styles.changeBadgeSubText}>vs yesterday</Text>
              </View>
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
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
