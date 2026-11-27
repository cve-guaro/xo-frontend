// components/game/DesktopSidebar.tsx
// Unified desktop left sidebar for XOET gaming platform.
// Strictly matches the updated responsive unified-container architecture:
// - Single cohesive container with sleek border, dark navy surface (#0D1320), no fragmented floating boxes
// - Top: Brand Logo + collapse/expand toggle button (< / >) matching Admin sidebar design
// - Center: Vertically scrollable Navigation list inside ScrollView (responsive on any screen height) with Solid Blue active pill
// - Bottom: Compact Welcome Bonus card + red Logout button (#FF3B57)
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { useAuth } from "../../context/authContext";
import { useSidebarCollapse } from "../../hooks/useSidebarCollapse";

const welcomeChestImg = require("../../assets/dashboard/welcome-bonus-chest.webp");

export type DesktopNavScreen = "home" | "history" | "leaderboard" | "transactions" | "profile" | "admin";

export interface LeaderboardItem {
  rank: number;
  username: string;
  wins: number;
  avatar?: string;
}

interface DesktopSidebarProps {
  user: any;
  balance?: number;
  currentScreen?: DesktopNavScreen;
  refreshProfile?: (force?: boolean) => void;
  setDepositVisible?: (v: boolean) => void;
  setWithdrawVisible?: (v: boolean) => void;
  topLeaders?: LeaderboardItem[];
  router: any;
  style?: any;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function DesktopSidebar({
  user,
  currentScreen = "home",
  router,
  style,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
}: DesktopSidebarProps) {
  const { width: winW } = useWindowDimensions();
  const { isCollapsed: globalCollapsed, toggleCollapsed: globalToggleCollapse } = useSidebarCollapse();
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : globalCollapsed;
  const isRail = (winW >= 768 && winW < 1024) || isCollapsed;
  const { logout } = useAuth();

  const toggleCollapse = () => {
    try {
      playTickSound();
    } catch {}
    haptics.tap();
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      globalToggleCollapse();
    }
  };

  const handleLogout = async () => {
    try {
      playTickSound();
    } catch {}
    haptics.tap();
    try {
      await logout();
    } catch (e) {
      console.warn("Logout error:", e);
    }
    router.replace("/login");
  };

  const handleNavClick = (screen: DesktopNavScreen) => {
    try {
      playTickSound();
    } catch {}
    haptics.tap();
    if (screen === currentScreen) return;
    if (screen === "home") router.push("/(authed)/home/gameplay");
    else if (screen === "history") router.push("/(authed)/home/history");
    else if (screen === "leaderboard") router.push("/(authed)/home/leaderboard");
    else if (screen === "transactions") router.push("/(authed)/home/transactions");
    else if (screen === "profile") router.push("/(authed)/home/account");
    else if (screen === "admin") router.push("/admin" as any);
  };

  const navItems = [
    { id: "home", label: "Home", activeIcon: "dice" as const, inactiveIcon: "dice-outline" as const },
    { id: "history", label: "History", activeIcon: "time" as const, inactiveIcon: "time-outline" as const },
    { id: "leaderboard", label: "Leaderboard", activeIcon: "trophy" as const, inactiveIcon: "trophy-outline" as const },
    { id: "transactions", label: "Transactions", activeIcon: "wallet" as const, inactiveIcon: "wallet-outline" as const },
    { id: "profile", label: "Profile", activeIcon: "person" as const, inactiveIcon: "person-outline" as const },
    ...(user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "maintenance" ||
    user?.is_superadmin ||
    (user as any)?.is_admin
      ? [{ id: "admin", label: "Admin Center", activeIcon: "shield-checkmark" as const, inactiveIcon: "shield-checkmark-outline" as const }]
      : []),
  ];

  return (
    <View style={[s.sidebar, isRail && s.sidebarRail, style]}>
      {/* ──────────────── 1. BRAND LOGO & COLLAPSE TOGGLE ──────────────── */}
      <View style={[s.topLogoRow, isRail && s.topLogoRowRail]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleNavClick("home")}
          style={[s.logoTouch, isRail && s.logoTouchRail]}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <Image
            source={
              isRail
                ? require("../../assets/brand/PNG/icon/xo-icon-color-transparent-128.png")
                : require("../../assets/brand/PNG/full-mark/xoet-horizontal-color-transparent-512.png")
            }
            style={isRail ? s.brandLogoImgRail : s.brandLogoImg}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleCollapse}
          style={[s.collapseToggleBtn, isRail && s.collapseToggleBtnRail]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isRail ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <Ionicons
            name={isRail ? "chevron-forward" : "chevron-back"}
            size={15}
            color={isRail ? "#00DAF3" : "#8893A7"}
          />
        </TouchableOpacity>
      </View>

      {/* ──────────────── 2. SCROLLABLE NAVIGATION LIST ──────────────── */}
      <ScrollView
        style={s.navScrollView}
        contentContainerStyle={s.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavClick(item.id as DesktopNavScreen)}
              style={[
                s.navItem,
                isRail && s.navItemRail,
                isActive && s.navItemActive,
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.inactiveIcon}
                size={isRail ? 20 : 18}
                color={isActive ? "#FFFFFF" : "#8893A7"}
                style={!isRail ? s.navIcon : undefined}
              />
              {!isRail && (
                <Text style={[s.navText, isActive && s.navTextActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ──────────────── 3. LOWER SECTION: WELCOME BONUS & LOGOUT ──────────────── */}
      <View style={s.lowerSection}>
        {/* Welcome Bonus Card */}
        {!isRail ? (
          <View style={s.welcomeCard}>
            <Image
              source={require("../../assets/images/welcome-banner-background-simple.webp")}
              style={s.welcomeCardBg}
              resizeMode="cover"
            />
            <View style={s.welcomeTextCol}>
              <Text style={s.welcomeTitle}>WELCOME BONUS</Text>
              <Text style={s.welcomeSubtitle}>Claim your welcome reward</Text>
              <View style={s.claimedPill}>
                <Text style={s.claimedPillText}>CLAIMED</Text>
              </View>
            </View>
            <View style={s.chestImageWrap}>
              <Image source={welcomeChestImg} style={s.chestImage} resizeMode="contain" />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleNavClick("home")}
            style={s.welcomeCardRail}
            activeOpacity={0.85}
            accessibilityLabel="Welcome Bonus Claimed"
          >
            <Image
              source={require("../../assets/images/welcome-banner-background-simple.webp")}
              style={s.welcomeCardBg}
              resizeMode="cover"
            />
            <Image source={welcomeChestImg} style={{ width: 34, height: 34, zIndex: 2 }} resizeMode="contain" />
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[s.logoutBtn, isRail && s.logoutBtnRail]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={isRail ? 20 : 17} color="#FF3B57" />
          {!isRail && (
            <Text style={s.logoutBtnText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Single Unified Box
  sidebar: {
    width: 260,
    backgroundColor: "#0D1320",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 12,
    height: "100%",
    justifyContent: "space-between",
  },
  sidebarRail: {
    width: 72,
    padding: 8,
    alignItems: "center",
  },

  // 1. Top Brand Logo & Toggle Row
  topLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 10,
    marginBottom: 6,
  },
  topLogoRowRail: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 0,
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    width: "100%",
  },
  logoTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  logoTouchRail: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoImg: {
    width: 120,
    height: 34,
  },
  brandLogoImgRail: {
    width: 32,
    height: 32,
  },
  collapseToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  collapseToggleBtnRail: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 218, 243, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  // 2. Navigation ScrollView
  navScrollView: {
    flex: 1,
    marginVertical: 4,
  },
  navScrollContent: {
    gap: 4,
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemRail: {
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 10,
    width: 48,
    alignSelf: "center",
  },
  navItemActive: {
    backgroundColor: "#00A2E8",
  },
  navIcon: {
    marginRight: 10,
  },
  navText: {
    color: "#8893A7",
    fontSize: 13,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // 3. Lower Section & Logout
  lowerSection: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  welcomeCard: {
    backgroundColor: "#111C27",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 162, 232, 0.3)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  welcomeCardBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  welcomeCardRail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "rgba(0, 162, 232, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    alignSelf: "center",
  },
  welcomeTextCol: {
    flex: 1,
    paddingRight: 4,
    zIndex: 2,
  },
  welcomeTitle: {
    color: "#00DAF3",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    color: "#8893A7",
    fontSize: 9.5,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 6,
  },
  claimedPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  claimedPillText: {
    color: "#B4B8CC",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  chestImageWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  chestImage: {
    width: 56,
    height: 56,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255, 59, 87, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 87, 0.25)",
    gap: 8,
  },
  logoutBtnRail: {
    width: 48,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 10,
    alignSelf: "center",
  },
  logoutBtnText: {
    color: "#FF3B57",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
