// components/game/DesktopHeader.tsx
// Unified desktop header for XOET gaming platform.
// Strictly conforms to XOET Visual System (Deep Navy, Slate, Gray Blue, Signal Red, Electric Blue, White).
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, useWindowDimensions } from "react-native";
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
  const { width } = useWindowDimensions();
  const isCompact = width < 1400;
  const isNarrow = width < 1180;
  const isUltraNarrow = width < 1060;

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
    <View style={[s.header, isCompact && { paddingHorizontal: 16, height: 74 }]}>
      <View style={s.headerContentWrapper}>
        {/* Brand Logo: Clean & Punchy X O ETHIOPIA */}
        <TouchableOpacity
          style={s.logoContainer}
          activeOpacity={0.85}
          onPress={() => router.push("/(authed)/home/gameplay")}
        >
          {isUltraNarrow ? (
            <Image
              source={require("../../assets/brand/PNG/icon/xo-icon-color-transparent-512.png")}
              style={{ width: 44, height: 32 }}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={require("../../assets/brand/PNG/full-mark/xoet-horizontal-color-transparent-512.png")}
              style={{ width: isCompact ? 108 : 126, height: isCompact ? 36 : 42 }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>

        {/* Center: 3-Button Toggle [ SPIN | XO GAME | ? SOON ] — Absolute horizontal center locked to viewport & carousel */}
        <View style={s.centerNavWrapper} pointerEvents="box-none">
          <View style={[s.toggleContainer, isCompact && { padding: 4, gap: 4 }]} pointerEvents="auto">
            <TouchableOpacity
              onPress={() => handleTabPress("SPIN")}
              style={[
                s.toggleBtn,
                selectedTab === "SPIN" && s.toggleBtnActiveSpin,
                isCompact && { paddingVertical: 7, paddingHorizontal: isNarrow ? 10 : 14 }
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name="aperture" size={isCompact ? 14 : 16} color={selectedTab === "SPIN" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: isNarrow ? 4 : 6 }} />
              <Text style={[s.toggleBtnText, selectedTab === "SPIN" && s.toggleBtnTextActive, isCompact && { fontSize: 11.5 }]}>SPIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress("XO_GAME")}
              style={[
                s.toggleBtn,
                selectedTab === "XO_GAME" && s.toggleBtnActiveXo,
                isCompact && { paddingVertical: 7, paddingHorizontal: isNarrow ? 10 : 14 }
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name="grid" size={isCompact ? 14 : 16} color={selectedTab === "XO_GAME" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: isNarrow ? 4 : 6 }} />
              <Text style={[s.toggleBtnText, selectedTab === "XO_GAME" && s.toggleBtnTextActive, isCompact && { fontSize: 11.5 }]}>
                {isNarrow ? "XO" : "XO GAME"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress("COMING_SOON")}
              style={[
                s.toggleBtn,
                selectedTab === "COMING_SOON" && s.toggleBtnActiveSoon,
                isCompact && { paddingVertical: 7, paddingHorizontal: isNarrow ? 10 : 14 }
              ]}
              activeOpacity={0.85}
            >
              <Ionicons name="help-circle" size={isCompact ? 14 : 16} color={selectedTab === "COMING_SOON" ? "#FFFFFF" : "#8893A7"} style={{ marginRight: isNarrow ? 4 : 6 }} />
              <Text style={[s.toggleBtnText, selectedTab === "COMING_SOON" && s.toggleBtnTextActive, isCompact && { fontSize: 11.5 }]}>
                {isNarrow ? "SOON" : "? SOON"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Utility Cluster */}
        <View style={[s.utilityCluster, isCompact && { gap: 6 }]}>
          {!isNarrow && (
            <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={[s.utilityBtn, isCompact && { paddingHorizontal: 10, paddingVertical: 6 }]} activeOpacity={0.8}>
              <Ionicons name="cloud-download-outline" size={isCompact ? 15 : 17} color="#CBD5E1" />
              <Text style={[s.utilityBtnText, isCompact && { fontSize: 11 }]}>APP</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleLanguageToggle} style={[s.utilityBtn, isCompact && { paddingHorizontal: 8, paddingVertical: 6 }]} activeOpacity={0.8}>
            <Ionicons name="globe-outline" size={isCompact ? 14 : 16} color="#CBD5E1" />
            {!isUltraNarrow && <Text style={[s.utilityBtnText, isCompact && { fontSize: 11 }]}>{language.toUpperCase()}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onToggleSound} style={[s.utilityBtn, isCompact && { paddingHorizontal: 8, paddingVertical: 6 }]} activeOpacity={0.8}>
            <Ionicons name={bgMusicPlaying ? "volume-medium-outline" : "volume-mute-outline"} size={isCompact ? 15 : 17} color="#CBD5E1" />
            {!isNarrow && <Text style={[s.utilityBtnText, isCompact && { fontSize: 11 }]}>{bgMusicPlaying ? "SOUND" : "MUTED"}</Text>}
          </TouchableOpacity>

          <View style={[s.bellBtn, isCompact && { width: 36, height: 36, borderRadius: 12 }]}>
            <Notification01
              size={isCompact ? 17 : 20}
              color="#CBD5E1"
              animateOnHover
              unreadCount={unreadCount}
              onPress={() => setNotificationsVisible(true)}
            />
          </View>

          {/* Profile Chip */}
          <TouchableOpacity onPress={() => router.push("/(authed)/home/account")} style={[s.profileChip, isCompact && { paddingHorizontal: 8, paddingVertical: 4, gap: 6 }]} activeOpacity={0.8}>
            <View style={[s.profileChipAvatar, isCompact && { width: 28, height: 28, borderRadius: 14 }]}>
              <Text style={[s.profileChipAvatarText, isCompact && { fontSize: 11 }]}>
                {user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}
              </Text>
            </View>
            {!isUltraNarrow && (
              <View>
                <Text style={[s.profileChipName, isCompact && { fontSize: 11.5, maxWidth: 80 }]} numberOfLines={1}>
                  {(user as any)?.display_name || user?.username || "Player"}
                </Text>
                <Text style={{ color: '#8893A7', fontSize: 9.5, fontWeight: '600' }} numberOfLines={1}>
                  @{user?.username || "player"}
                </Text>
              </View>
            )}
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
    position: "relative",
    zIndex: 100,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.45)",
  } as any,
  headerContentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    position: "relative",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    zIndex: 20,
  },
  centerNavWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 10,
  } as any,
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
    pointerEvents: "auto",
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
