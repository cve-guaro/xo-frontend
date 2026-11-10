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
    <View style={[s.leftSidebar, style, isRail && s.leftSidebarRail, isRail && { width: 72 }]}>
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={s.userCardName} numberOfLines={1}>
                      {(user as any)?.display_name || user?.username || "Player"}
                    </Text>
                    <View style={s.onlineRow}>
                      <View style={s.onlineDot} />
                      <Text style={s.onlineText}>Online</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#8893A7", fontSize: 11, fontWeight: "600", marginTop: 2 }} numberOfLines={1}>
                    @{user?.username || "player"}
                  </Text>
                </View>
              </View>

              {/* Direct Integrated Wallet Balance (No Oversized Inner Box) */}
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: "#8893A7", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>
                    Wallet Balance
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900", fontFamily: "Space Grotesk, sans-serif", marginTop: 2 }}>
                    {showBalance ? `ETB ${balance.toLocaleString()}` : "ETB ••••••••"}
                  </Text>
                </View>

                {/* Inline Controls: Eye toggle + Refresh Spinner */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
                      size={16}
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

              {/* Subtle Hairline Divider */}
              <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", marginVertical: 12 }} />

              {/* Bottom Section: Dedicated Wallet Action Pills */}
              <View style={s.balancePillsRow}>
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setDepositVisible(true);
                  }}
                  style={s.depositPill}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Deposit funds"
                >
                  <Ionicons name="arrow-down-circle-outline" size={15} color="#10B981" />
                  <Text style={s.depositPillText}>Deposit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    setWithdrawVisible(true);
                  }}
                  style={s.withdrawPill}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Withdraw funds"
                >
                  <Ionicons name="arrow-up-circle-outline" size={15} color="#FF1744" />
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

        {/* Community & Support Card — Always Present Under Navigation Across Every Page */}
        {!isRail ? (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Ionicons name="globe-outline" size={17} color="#00BFFF" />
              <Text style={s.communityTitle}>COMMUNITY & SUPPORT</Text>
            </View>

            {/* Link 1: Telegram Channel */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router?.push?.("https://t.me/xoethiopia" as any)}
              style={[s.supportLinkBtn, { backgroundColor: "rgba(0, 191, 255, 0.12)", borderColor: "rgba(0, 191, 255, 0.4)" }]}
              accessibilityLabel="Join Telegram Channel"
            >
              <Ionicons name="paper-plane" size={15} color="#00BFFF" />
              <Text style={[s.supportLinkBtnText, { color: "#00BFFF" }]}>JOIN TELEGRAM CHANNEL</Text>
            </TouchableOpacity>

            {/* Link 2: 24/7 Live Support */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router?.push?.("https://t.me/xoetsupport" as any)}
              style={[s.supportLinkBtn, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.4)", marginTop: 10 }]}
              accessibilityLabel="24/7 Live Support"
            >
              <Ionicons name="headset" size={15} color="#10B981" />
              <Text style={[s.supportLinkBtnText, { color: "#10B981" }]}>24/7 LIVE SUPPORT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Rail Mode (72px) — Icon-only responsive compact action pills */
          <View style={[s.card, s.cardRail, { gap: 10, paddingVertical: 12 }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router?.push?.("https://t.me/xoethiopia" as any)}
              style={[s.supportRailBtn, { backgroundColor: "rgba(0, 191, 255, 0.14)", borderColor: "rgba(0, 191, 255, 0.45)" }]}
              accessibilityLabel="Join Telegram Channel"
            >
              <Ionicons name="paper-plane" size={17} color="#00BFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router?.push?.("https://t.me/xoetsupport" as any)}
              style={[s.supportRailBtn, { backgroundColor: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.45)" }]}
              accessibilityLabel="24/7 Live Support"
            >
              <Ionicons name="headset" size={17} color="#10B981" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  leftSidebar: {
    width: 300,
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
    flexShrink: 1,
    fontFamily: "Space Grotesk, sans-serif",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  onlineText: {
    color: "#10B981",
    fontSize: 10.5,
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
  communityTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.8,
  },
  supportLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
    ...(Platform.OS === "web" ? { cursor: "pointer", transition: "all 150ms ease" } as any : {}),
  },
  supportLinkBtnText: {
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    fontFamily: "Space Grotesk, sans-serif",
  },
  supportRailBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    alignSelf: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer", transition: "all 150ms ease" } as any : {}),
  },
});
