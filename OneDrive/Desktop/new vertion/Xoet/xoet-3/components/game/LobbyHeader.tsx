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
  setNotificationsVisible: (visible: boolean) => void;
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
  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.headerTop}>
        {/* Left Side: Avatar + Welcome back */}
        <TouchableOpacity
          onPress={() => goReplace("/(authed)/home/account")}
          activeOpacity={0.85}
          style={styles.avatarButton}
        >
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.8)" />
          </View>
          <View>
            <Text style={styles.welcomeText}>
              {isEN ? "WELCOME BACK" : "እንኳን ደህና መጡ"}
            </Text>
            <Text style={styles.usernameText}>
              {user?.username || "bina"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right Side: APP, Language, Bell */}
        <View style={styles.headerBtns}>
          {/* APP Download Button (Bordered dark capsule) */}
          {!isPwaInstalled && (
            <Animated.View style={{ transform: [{ scale: appPulseAnim }] }}>
              <TouchableOpacity
                onPress={handleAppDownload}
                activeOpacity={0.85}
                style={[
                  styles.downloadBtn,
                  deferredPrompt
                    ? styles.downloadBtnActive
                    : styles.downloadBtnDefault,
                ]}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={14}
                  color={deferredPrompt ? "#8b5cf6" : "#fff"}
                />
                <Text
                  style={[
                    styles.downloadText,
                    { color: deferredPrompt ? "#8b5cf6" : "#fff" },
                  ]}
                >
                  APP
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Language button */}
          <TouchableOpacity
            onPress={handleLanguageToggle}
            activeOpacity={0.85}
            style={styles.actionBtn}
          >
            <Ionicons name="language" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Notification Bell with Badge */}
          <TouchableOpacity
            onPress={() => goReplace("/(authed)/notifications")}
            activeOpacity={0.85}
            style={styles.actionBtn}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            {unreadCount > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Available Balance Card */}
      <LinearGradient
        colors={["rgba(20, 19, 26, 0.6)", "rgba(27, 26, 36, 0.6)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeaderRow}>
          <Text style={styles.balanceLabel}>
            {isEN ? "AVAILABLE BALANCE" : "ቀሪ ሂሳብ"}
          </Text>

          <TouchableOpacity
            onPress={handleRefreshProfile}
            activeOpacity={0.85}
            style={styles.refreshBtnCompact}
          >
            <Ionicons name="reload-outline" size={12} color="#a78bfa" />
            <Text style={styles.refreshTextCompact}>
              {isEN ? "Refresh" : "አድስ"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceValue}>
            ETB {Math.floor(balance).toLocaleString()}
          </Text>
          {/* Purple dot next to the number */}
          <View style={styles.balanceDot} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

  const styles = StyleSheet.create({
  header: { marginTop: 12, marginBottom: 4 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usernameText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  headerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  downloadBtnActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    ...Platform.select({
      web: {
        boxShadow: "0 0 8px #8b5cf6",
      } as any,
    }),
  },
  downloadBtnDefault: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  downloadText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  balanceCard: {
    borderRadius: 24,
    padding: 16,
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    position: "relative",
  },
  balanceWatermark: {
    position: "absolute",
    right: -20,
    bottom: -45,
    fontSize: 140,
    fontWeight: "900",
    color: "rgba(139, 92, 246, 0.06)",
    transform: [{ rotate: "-12deg" }],
    zIndex: 0,
  },
  balanceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  balanceLeft: {
    flex: 1,
    zIndex: 1,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  balanceValue: {
    color: "rgba(255,255,255,0.98)",
    fontSize: 30,
    fontWeight: "900",
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8b5cf6",
    alignSelf: "center",
    marginTop: 10,
  },
  refreshBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(139, 92, 246, 0.4)",
  },
  refreshTextCompact: {
    color: "#c084fc",
    fontWeight: "800",
    fontSize: 12,
  },
});
