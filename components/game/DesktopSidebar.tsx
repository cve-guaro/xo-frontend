// components/game/DesktopSidebar.tsx
// Unified desktop left sidebar for XOET gaming platform.
// Strictly conforms to XOET Visual System (Deep Navy, Slate, Gray Blue, Signal Red, Electric Blue, White).
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SyncIcon } from "../SvgIcons";
import { Home01, Time01, Trophy01, Wallet01, User01, Shield01 } from "../animate-ui/icons/hugeicons/sidebar-icons";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { useAuth } from "../../context/authContext";
import { API_URL } from "../../config";

export type DesktopNavScreen = "home" | "history" | "leaderboard" | "transactions" | "profile" | "admin";

interface DesktopSidebarProps {
  user: any;
  balance: number;
  currentScreen: DesktopNavScreen;
  refreshProfile?: (force?: boolean) => void;
  setDepositVisible?: (v: boolean) => void;
  setWithdrawVisible?: (v: boolean) => void;
  router: any;
  style?: any;
}

export default function DesktopSidebar({
  user,
  balance = 0,
  currentScreen = "home",
  refreshProfile = () => {},
  setDepositVisible = () => {},
  setWithdrawVisible = () => {},
  router,
  style,
}: DesktopSidebarProps) {
  const { token } = useAuth();
  const [todayStats, setTodayStats] = useState({ deposits: 0, withdrawals: 0, count: 0 });
  const refreshSpinAnim = useRef(new Animated.Value(0)).current;

  const handleRefreshClick = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    Animated.timing(refreshSpinAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => refreshSpinAnim.setValue(0));
    try {
      refreshProfile?.(true);
    } catch (_) {}
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/account/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data?.stats?.today) {
          setTodayStats(data.stats.today);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleNavClick = (screen: DesktopNavScreen) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    if (screen === currentScreen) return;
    if (screen === "home") router.push("/(authed)/home/gameplay");
    else if (screen === "history") router.push("/(authed)/home/history");
    else if (screen === "leaderboard") router.push("/(authed)/home/leaderboard");
    else if (screen === "transactions") router.push("/(authed)/home/transactions");
    else if (screen === "profile") router.push("/(authed)/home/account");
    else if (screen === "admin") router.push("/admin" as any);
  };

  return (
    <View style={[s.leftSidebar, style]}>
      <View style={{ gap: 16 }}>
        {/* Profile & Available Balance Card */}
        <View style={s.card}>
          <View style={s.userCardHeader}>
            <View style={s.userCardAvatar}>
              <Text style={s.userCardAvatarText}>
                {user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}
              </Text>
            </View>
            <View>
              <Text style={s.userCardName} numberOfLines={1}>
                {user?.username || (user?.number ? `User ${user.number.slice(-4)}` : "Set Your Name")}
              </Text>
              <View style={s.onlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.onlineText}>Online</Text>
              </View>
            </View>
          </View>

          <View style={s.tokensRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.tokenLabel}>AVAILABLE BALANCE</Text>
              <Text style={[s.tokenVal, { color: "#00BFFF" }]}>ETB {balance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              onPress={handleRefreshClick}
              style={[s.tokenPlusBtn, { backgroundColor: "#0091EA", boxShadow: "0 2px 10px rgba(0, 145, 234, 0.4)" } as any]}
              activeOpacity={0.8}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: refreshSpinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <SyncIcon size={14} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Links — Solid Blue Pill on Active, Solid White Text & Icon */}
        <View style={s.card}>
          <TouchableOpacity
            onPress={() => handleNavClick("home")}
            style={[s.navItem, currentScreen === "home" && s.navItemActive]}
            activeOpacity={0.85}
          >
            <View style={s.navIconShell}>
              <Home01 size={20} color={currentScreen === "home" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "home"} animateOnHover />
            </View>
            <Text style={[s.navText, currentScreen === "home" && s.navTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavClick("history")}
            style={[s.navItem, currentScreen === "history" && s.navItemActive]}
            activeOpacity={0.85}
          >
            <View style={s.navIconShell}>
              <Time01 size={20} color={currentScreen === "history" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "history"} animateOnHover />
            </View>
            <Text style={[s.navText, currentScreen === "history" && s.navTextActive]}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavClick("leaderboard")}
            style={[s.navItem, currentScreen === "leaderboard" && s.navItemActive]}
            activeOpacity={0.85}
          >
            <View style={s.navIconShell}>
              <Trophy01 size={20} color={currentScreen === "leaderboard" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "leaderboard"} animateOnHover />
            </View>
            <Text style={[s.navText, currentScreen === "leaderboard" && s.navTextActive]}>Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavClick("transactions")}
            style={[s.navItem, currentScreen === "transactions" && s.navItemActive]}
            activeOpacity={0.85}
          >
            <View style={s.navIconShell}>
              <Wallet01 size={20} color={currentScreen === "transactions" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "transactions"} animateOnHover />
            </View>
            <Text style={[s.navText, currentScreen === "transactions" && s.navTextActive]}>Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavClick("profile")}
            style={[s.navItem, currentScreen === "profile" && s.navItemActive]}
            activeOpacity={0.85}
          >
            <View style={s.navIconShell}>
              <User01 size={20} color={currentScreen === "profile" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "profile"} animateOnHover />
            </View>
            <Text style={[s.navText, currentScreen === "profile" && s.navTextActive]}>Profile</Text>
          </TouchableOpacity>

          {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "maintenance") && (
            <TouchableOpacity
              onPress={() => handleNavClick("admin")}
              style={[s.navItem, currentScreen === "admin" && s.navItemActive]}
              activeOpacity={0.85}
            >
              <View style={s.navIconShell}>
                <Shield01 size={20} color={currentScreen === "admin" ? "#FFFFFF" : "#8893A7"} solid={currentScreen === "admin"} animateOnHover />
              </View>
              <Text style={[s.navText, currentScreen === "admin" && s.navTextActive]}>Admin Center</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet Info & Quick Fund Actions */}
        <View style={s.card}>
          <Text style={s.sectionTitleSmall}>WALLET</Text>
          <View style={s.walletRow}>
            <Text style={s.walletLabel}>Deposit</Text>
            <Text style={[s.walletValSmall, { color: "#10B981" }]}>
              + {todayStats.deposits.toLocaleString()} ETB
            </Text>
          </View>
          <View style={s.walletRow}>
            <Text style={s.walletLabel}>Withdraw</Text>
            <Text style={[s.walletValSmall, { color: "#FF1744" }]}>
              - {todayStats.withdrawals.toLocaleString()} ETB
            </Text>
          </View>
          <View style={s.walletRow}>
            <Text style={s.walletLabel}>Transactions</Text>
            <Text style={s.walletValSecond}>
              {todayStats.count} today
            </Text>
          </View>

          <View style={s.walletButtons}>
            <TouchableOpacity
              onPress={() => setDepositVisible(true)}
              style={[s.walletBtnSmall, { borderColor: "#00BFFF", backgroundColor: "rgba(0, 191, 255, 0.08)" }]}
              activeOpacity={0.8}
            >
              <Text numberOfLines={1} style={[s.walletBtnTextSmall, { color: "#00BFFF" }]}>DEPOSIT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWithdrawVisible(true)}
              style={[s.walletBtnSmall, { borderColor: "#FF1744", backgroundColor: "rgba(255, 23, 68, 0.08)" }]}
              activeOpacity={0.8}
            >
              <Text numberOfLines={1} style={[s.walletBtnTextSmall, { color: "#FF1744" }]}>WITHDRAW</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  leftSidebar: {
    width: 270,
  },
  card: {
    backgroundColor: "#111827", // Brand Slate
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    padding: 20,
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
  } as any,
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  userCardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    borderWidth: 2,
    borderColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  userCardAvatarText: {
    color: "#00BFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  userCardName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    maxWidth: 170,
    fontFamily: "Space Grotesk, sans-serif",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  onlineText: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "700",
  },
  tokensRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080F17",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#233041",
    padding: 14,
  },
  tokenLabel: {
    color: "#8893A7",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tokenVal: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
    fontFamily: "Space Grotesk, sans-serif",
  },
  tokenPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "#0091EA",
    boxShadow: "0 4px 16px rgba(0, 145, 234, 0.45)",
  } as any,
  navIconShell: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  navIconShellActive: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  navItemActiveBar: {
    display: "none",
  },
  navText: {
    color: "#94A3B8",
    fontSize: 14.5,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  navTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionTitleSmall: {
    color: "#8893A7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 14,
    fontFamily: "Space Grotesk, sans-serif",
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  walletLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  walletValSmall: {
    fontSize: 13.5,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  walletValSecond: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  walletButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  walletBtnSmall: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnTextSmall: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontFamily: "Space Grotesk, sans-serif",
  },
});
