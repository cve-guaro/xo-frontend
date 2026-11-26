// components/game/DesktopPageShell.tsx
// Unified desktop page shell for XOET gaming platform.
// Guarantees 100% visual and structural consistency across Home, History, Leaderboard, Transactions, and Profile:
// - Left: Full-height DesktopSidebar anchored from top of the viewport to the bottom
// - Right: Top DesktopHeader (wallet balance on the left, language / notification / download / profile on the right)
//   followed by the page-specific content area.
import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import DesktopHeader from "./DesktopHeader";
import DesktopSidebar, { DesktopNavScreen } from "./DesktopSidebar";
import { useSidebarCollapse } from "../../hooks/useSidebarCollapse";

interface DesktopPageShellProps {
  currentScreen: DesktopNavScreen;
  user: any;
  balance?: number;
  language?: string;
  handleLanguageToggle?: () => void;
  setPwaModalVisible?: (v: boolean) => void;
  setDepositVisible?: (v: boolean) => void;
  setWithdrawVisible?: (v: boolean) => void;
  refreshProfile?: (force?: boolean) => void;
  unreadCount?: number;
  setNotificationsVisible?: (v: boolean) => void;
  router: any;
  children: React.ReactNode;
  style?: any;
}

export default function DesktopPageShell({
  currentScreen,
  user,
  balance,
  language = "en",
  handleLanguageToggle,
  setPwaModalVisible,
  setDepositVisible,
  setWithdrawVisible,
  refreshProfile,
  unreadCount = 0,
  setNotificationsVisible,
  router,
  children,
  style,
}: DesktopPageShellProps) {
  const { width: winW } = useWindowDimensions();
  const { isCollapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapse } = useSidebarCollapse();
  const isRail = (winW >= 768 && winW < 1024) || sidebarCollapsed;

  const displayBalance =
    balance !== undefined
      ? balance
      : Number(user?.available_balance || 0);

  return (
    <View style={[s.layoutRoot, style]}>
      {/* ──────────────── FULL-HEIGHT LEFT SIDEBAR ──────────────── */}
      <View style={s.sidebarContainer}>
        <DesktopSidebar
          user={user}
          balance={displayBalance}
          currentScreen={currentScreen}
          refreshProfile={refreshProfile}
          setDepositVisible={setDepositVisible}
          setWithdrawVisible={setWithdrawVisible}
          router={router}
          style={{ height: "100%" }}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </View>

      {/* ──────────────── RIGHT MAIN COLUMN ──────────────── */}
      <View style={s.rightColumn}>
        {/* Top Header */}
        <DesktopHeader
          user={user}
          balance={displayBalance}
          setDepositVisible={setDepositVisible}
          setWithdrawVisible={setWithdrawVisible}
          language={language}
          handleLanguageToggle={handleLanguageToggle}
          setPwaModalVisible={setPwaModalVisible}
          unreadCount={unreadCount}
          setNotificationsVisible={setNotificationsVisible}
          router={router}
        />

        {/* Page Content Body */}
        <View style={s.pageContentArea}>
          {children}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  layoutRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#060613",
    height: "100%",
    width: "100%",
  },
  sidebarContainer: {
    height: "100%",
    paddingVertical: 14,
    paddingLeft: 14,
  },
  rightColumn: {
    flex: 1,
    height: "100%",
    flexDirection: "column",
    backgroundColor: "#060613",
    overflow: "hidden",
  },
  pageContentArea: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
});
