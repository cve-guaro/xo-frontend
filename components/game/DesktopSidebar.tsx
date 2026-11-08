// components/game/DesktopSidebar.tsx
// Unified desktop left sidebar for XOET gaming platform.
// Strictly conforms to XOET Visual System (Deep Navy, Slate, Gray Blue, Signal Red, Electric Blue, White).
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform, useWindowDimensions } from "react-native";
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
  const { width: winW } = useWindowDimensions();
  const isRail = winW >= 768 && winW < 1120;
  const { token } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
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
    <View style={[s.leftSidebar, isRail && s.leftSidebarRail, style]}>
      <View style={{ gap: isRail ? 10 : 16, alignItems: isRail ? "center" : "stretch" }}>
        {/* Profile & Available Balance Card */}
        <View style={[s.card, isRail && s.cardRail]}>
          {isRail ? (
            <TouchableOpacity
              onPress={() => handleNavClick("profile")}
              style={s.userCardAvatarRail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Text style={s.userCardAvatarText}>
                {user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}
              </Text>
              <View style={s.onlineDotRail} />
            </TouchableOpacity>
          ) : (
            <>
              <View style={s.userCardHeader}>
                <View style={s.userCardAvatar}>
                  <Text style={s.userCardAvatarText}>
                    {user?.username ? user.username.slice(0, 1).toUpperCase() : "A"}
                  </Text>
                </View>
                <View>
                  <Text style={s.userCardName} numberOfLines={1}>
                    {(user as any)?.display_name || user?.username || "Player"}
                  </Text>
                  <Text style={{ color: "#8893A7", fontSize: 11, fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                    @{user?.username || "player"}
                  </Text>
                  <View style={s.onlineRow}>
                    <View style={s.onlineDot} />
                    <Text style={s.onlineText}>Online</Text>
                  </View>
                </View>
              </View>

              <View style={s.tokensRow}>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={[s.tokenVal, { color: "#FFFFFF" }]} numberOfLines={1}>
                    {showBalance ? `ETB ${balance.toLocaleString()}` : "ETB ••••••••"}
                  </Text>
                  <Text style={s.tokenLabel}>Wallet balance</Text>
                </View>

                {/* Right controls: Eye toggle on top, refresh right under eye */}
                <View style={{ alignItems: "center", gap: 6, paddingLeft: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      haptics.tap();
                      setShowBalance(!showBalance);
                    }}
                    style={s.eyeToggleBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle balance visibility"
                  >
                    <Ionicons
                      name={showBalance ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color="#8893A7"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRefreshClick}
                    style={s.refreshBtnSmall}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh Balance"
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
                      <SyncIcon size={13} color="#00BFFF" />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Two Pill Action Buttons: [ ↙ Deposit ] and [ ↗ Withdraw ] */}
              <View style={s.balancePillsRow}>
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setDepositVisible(true);
                  }}
                  style={s.depositPill}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Deposit funds"
                >
                  <Ionicons name="arrow-down" size={13} color="#10B981" style={{ transform: [{ rotate: "45deg" }] }} />
                  <Text style={s.depositPillText}>Deposit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setWithdrawVisible(true);
                  }}
                  style={s.withdrawPill}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Withdraw funds"
                >
                  <Ionicons name="arrow-up" size={13} color="#FF1744" style={{ transform: [{ rotate: "45deg" }] }} />
                  <Text style={s.withdrawPillText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Navigation Links — Solid Blue Pill on Active, Solid White Text & Icon */}
        <View style={[s.card, isRail && s.cardRail]}>
          {[
            { id: "home", label: "Home", Icon: Home01 },
            { id: "history", label: "History", Icon: Time01 },
            { id: "leaderboard", label: "Leaderboard", Icon: Trophy01 },
            { id: "transactions", label: "Transactions", Icon: Wallet01 },
            { id: "profile", label: "Profile", Icon: User01 },
            ...(user?.role === "admin" || user?.role === "superadmin" || user?.role === "maintenance"
              ? [{ id: "admin", label: "Admin Center", Icon: Shield01 }]
              : []),
          ].map(({ id, label, Icon }) => {
            const isActive = currentScreen === id;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => handleNavClick(id as DesktopNavScreen)}
                style={[
                  s.navItem,
                  isRail && s.navItemRail,
                  isActive && s.navItemActive,
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <View style={[s.navIconShell, isRail && { marginRight: 0 }]}>
                  <Icon size={20} color={isActive ? "#FFFFFF" : "#8893A7"} solid={isActive} animateOnHover />
                </View>
                {!isRail && (
                  <Text style={[s.navText, isActive && s.navTextActive]}>{label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Wallet Info & Quick Fund Actions */}
        {!isRail ? (
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
                accessibilityRole="button"
                accessibilityLabel="Deposit"
              >
                <Text numberOfLines={1} style={[s.walletBtnTextSmall, { color: "#00BFFF" }]}>DEPOSIT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWithdrawVisible(true)}
                style={[s.walletBtnSmall, { borderColor: "#FF1744", backgroundColor: "rgba(255, 23, 68, 0.08)" }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Withdraw"
              >
                <Text numberOfLines={1} style={[s.walletBtnTextSmall, { color: "#FF1744" }]}>WITHDRAW</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[s.card, s.cardRail, { gap: 8 }]}>
            <TouchableOpacity
              onPress={() => setDepositVisible(true)}
              style={[s.railActionBtn, { borderColor: "#00BFFF", backgroundColor: "rgba(0, 191, 255, 0.12)" }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Deposit"
            >
              <Ionicons name="add" size={18} color="#00BFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWithdrawVisible(true)}
              style={[s.railActionBtn, { borderColor: "#FF1744", backgroundColor: "rgba(255, 23, 68, 0.12)" }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Withdraw"
            >
              <Ionicons name="arrow-down" size={16} color="#FF1744" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  leftSidebar: {
    width: 270,
  },
  leftSidebarRail: {
    width: 72,
  },
  card: {
    backgroundColor: "#111827", // Brand Slate
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    padding: 20,
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
  } as any,
  cardRail: {
    padding: 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
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
  userCardAvatarRail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    borderWidth: 2,
    borderColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  onlineDotRail: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#111827",
  },
  railActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
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
  navItemRail: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#00BFFF",
    boxShadow: "0 4px 16px rgba(0, 191, 255, 0.45)",
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
  eyeToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(136, 147, 167, 0.12)",
  },
  refreshBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 191, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 191, 255, 0.3)",
  },
  balancePillsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  depositPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1.2,
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...(Platform.OS === "web" ? { cursor: "pointer", transition: "all 150ms ease" } as any : {}),
  },
  depositPillText: {
    color: "#10B981",
    fontSize: 12.5,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },
  withdrawPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 23, 68, 0.12)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 23, 68, 0.4)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...(Platform.OS === "web" ? { cursor: "pointer", transition: "all 150ms ease" } as any : {}),
  },
  withdrawPillText: {
    color: "#FF1744",
    fontSize: 12.5,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },
});
