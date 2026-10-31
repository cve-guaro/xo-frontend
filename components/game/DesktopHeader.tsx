// components/game/DesktopHeader.tsx
// Unified desktop header for XOET gaming platform.
// Strictly conforms to XOET Visual System (Deep Navy, Slate, Gray Blue, Signal Red, Electric Blue, White).
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Notification01 } from "../animate-ui/icons/hugeicons/notification-01";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";



export type DesktopTabType = "SPIN" | "XO_GAME" | "COMING_SOON";

interface DesktopHeaderProps {
  user: any;
  language: string;
  handleLanguageToggle: () => void;
  selectedTab?: DesktopTabType;
  onSelectTab?: (tab: DesktopTabType) => void;
  setPwaModalVisible?: (v: boolean) => void;
  bgMusicPlaying?: boolean;
  onToggleSound?: () => void;
  unreadCount?: number;
  setNotificationsVisible?: (v: boolean) => void;
  router: any;
}

export default function DesktopHeader({
  user,
  language = "en",
  handleLanguageToggle,
  selectedTab = "XO_GAME",
  onSelectTab,
  setPwaModalVisible = () => {},
  bgMusicPlaying = true,
  onToggleSound = () => {},
  unreadCount = 0,
  setNotificationsVisible = () => {},
  router,
}: DesktopHeaderProps) {
  const handleTabPress = (tab: DesktopTabType) => {
    try { playTickSound(); } catch {}
    haptics.tap();
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      // If on another page, navigate back to home with the tab
      router.push("/(authed)/home/gameplay");
    }
  };

  return (
    <View style={s.header}>
      <View style={s.headerContentWrapper}>
        {/* Brand Logo: Clean & Punchy X O ETHIOPIA */}
        <TouchableOpacity
          style={s.logoContainer}
          activeOpacity={0.85}
          onPress={() => router.push("/(authed)/home/gameplay")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ color: "#FF1744", fontSize: 26, fontWeight: "900", fontFamily: "Space Grotesk, sans-serif" }}>X</Text>
            <Text style={{ color: "#00BFFF", fontSize: 26, fontWeight: "900", fontFamily: "Space Grotesk, sans-serif" }}>O</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginLeft: 6, letterSpacing: 2.2, fontFamily: "Space Grotesk, sans-serif" }}>ETHIOPIA</Text>
          </View>
        </TouchableOpacity>

        {/* Center: 3-Button Toggle [ SPIN | XO GAME | ? SOON ] — Dead Center Horizontally */}
        <View style={s.centerNavWrapper} pointerEvents="box-none">
          <View style={s.toggleContainer}>
            <TouchableOpacity
              onPress={() => handleTabPress("SPIN")}
              style={[s.toggleBtn, selectedTab === "SPIN" && s.toggleBtnActiveSpin]}
              activeOpacity={0.85}
            >
              <Ionicons name="aperture" size={16} color={selectedTab === "SPIN" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: 7 }} />
              <Text style={[s.toggleBtnText, selectedTab === "SPIN" && s.toggleBtnTextActive]}>SPIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress("XO_GAME")}
              style={[s.toggleBtn, selectedTab === "XO_GAME" && s.toggleBtnActiveXo]}
              activeOpacity={0.85}
            >
              <Ionicons name="grid" size={16} color={selectedTab === "XO_GAME" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: 7 }} />
              <Text style={[s.toggleBtnText, selectedTab === "XO_GAME" && s.toggleBtnTextActive]}>XO GAME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress("COMING_SOON")}
              style={[s.toggleBtn, selectedTab === "COMING_SOON" && s.toggleBtnActiveSoon]}
              activeOpacity={0.85}
            >
              <Ionicons name="help-circle" size={16} color={selectedTab === "COMING_SOON" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: 7 }} />
              <Text style={[s.toggleBtnText, selectedTab === "COMING_SOON" && s.toggleBtnTextActive]}>? SOON</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Utility Cluster (VIP Program Removed) */}
        <View style={s.utilityCluster}>
          <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={s.utilityBtn} activeOpacity={0.8}>
            <Ionicons name="cloud-download-outline" size={17} color="#CBD5E1" />
            <Text style={s.utilityBtnText}>APP</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLanguageToggle} style={s.utilityBtn} activeOpacity={0.8}>
            <Ionicons name="globe-outline" size={16} color="#CBD5E1" />
            <Text style={s.utilityBtnText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onToggleSound} style={s.utilityBtn} activeOpacity={0.8}>
            <Ionicons name={bgMusicPlaying ? "volume-medium-outline" : "volume-mute-outline"} size={17} color="#CBD5E1" />
            <Text style={s.utilityBtnText}>{bgMusicPlaying ? "SOUND" : "MUTED"}</Text>
          </TouchableOpacity>

          <View style={s.bellBtn}>
            <Notification01
              size={20}
              color="#CBD5E1"
              animateOnHover
              unreadCount={unreadCount}
              onPress={() => setNotificationsVisible(true)}
            />
          </View>

          {/* Profile Chip — Clean without VIP badge */}
          <TouchableOpacity onPress={() => router.push("/(authed)/home/account")} style={s.profileChip} activeOpacity={0.8}>
            <View style={s.profileChipAvatar}>
              <Text style={s.profileChipAvatarText}>
                {user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}
              </Text>
            </View>
            <View>
              <Text style={s.profileChipName}>{user?.username || "Player"}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={{ color: '#8893A7', fontSize: 10, fontWeight: '700' }}>Active</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 84,
    backgroundColor: "#080F17", // Brand Deep Navy
    borderBottomWidth: 1.5,
    borderBottomColor: "#1E293B",
    justifyContent: "center",
    paddingHorizontal: 28,
    zIndex: 100,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.45)",
  } as any,
  headerContentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    position: "relative",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  centerNavWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    pointerEvents: "box-none" as any,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827", // Brand Slate
    borderRadius: 26,
    padding: 6,
    borderWidth: 1.5,
    borderColor: "#233041",
    gap: 8,
    boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.5)",
  } as any,
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 22,
    ...(Platform.OS === "web" ? {
      transition: "all 250ms cubic-bezier(0.16, 1, 0.3, 1)",
      cursor: "pointer",
      userSelect: "none",
    } as any : {}),
  },
  toggleBtnActiveSpin: {
    backgroundColor: "#FF1744", // Brand Signal Red
    boxShadow: "0 4px 14px rgba(255, 23, 68, 0.45)",
  } as any,
  toggleBtnActiveXo: {
    backgroundColor: "#00BFFF", // Brand Electric Blue
    boxShadow: "0 4px 14px rgba(0, 191, 255, 0.45)",
  } as any,
  toggleBtnActiveSoon: {
    backgroundColor: "#233041",
  },
  toggleBtnText: {
    color: "#8893A7",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
  },
  utilityCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 20,
  },
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderWidth: 1.2,
    borderColor: "#233041",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  utilityBtnText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Space Grotesk, Inter, sans-serif",
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#111827",
    borderWidth: 1.2,
    borderColor: "#233041",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#FF1744",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderWidth: 1.2,
    borderColor: "#233041",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  profileChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00BFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipAvatarText: {
    color: "#080F17",
    fontSize: 12,
    fontWeight: "900",
  },
  profileChipName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  profileChipVip: {
    color: "#F5B642",
    fontSize: 9.5,
    fontWeight: "800",
  },
});
