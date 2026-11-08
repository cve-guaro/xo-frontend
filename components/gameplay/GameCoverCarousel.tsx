import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Carousel,
  type CarouselItemAnimation,
  type CarouselRef,
  type CarouselRenderItem,
  Pagination,
} from "react-native-reanimated-carousel";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";

const spinCardBordImg = require("../../assets/images/spin-card bord.webp");
const spinBgRedImg = require("../../assets/images/spin-background-red.webp");
const xoBgBlueImg = require("../../assets/images/xo-background-blue.webp");
const xoCardBordImg = require("../../assets/images/xo-card bord.webp");

export type MobileCardMode = "SPIN" | "XO_GAME" | "COMING_SOON";
const CARDS: MobileCardMode[] = ["SPIN", "XO_GAME", "COMING_SOON"];

export interface GameCoverCarouselProps {
  width: number;
  scrollX?: any;
  mobileCarouselRef?: React.RefObject<any>;
  isEN: boolean;
  selectedTab: string;
  playTickSound: () => void;
  haptics: any;
  setSelectedTab: (tab: any) => void;
  setActiveGameMode: (mode: any) => void;
  router: any;
  setSpinBetModalVisible: (visible: boolean) => void;
  openRoomSheet: (mode?: "FRIENDS") => void;
}

export const GameCoverCarousel: React.FC<GameCoverCarouselProps> = ({
  width,
  mobileCarouselRef,
  isEN,
  selectedTab,
  playTickSound,
  haptics,
  setSelectedTab,
  setActiveGameMode,
  router,
  setSpinBetModalVisible,
  openRoomSheet,
}) => {
  const itemSize = Math.min(width * 0.78, 315);
  const cardWidth = Math.min(itemSize, 305);

  const carouselRef = useRef<CarouselRef>(null);
  const initialIndex = selectedTab === "SPIN" ? 0 : selectedTab === "XO_GAME" ? 1 : 2;
  const [index, setIndex] = useState(initialIndex);
  const progress = useSharedValue(initialIndex);

  // Expose scrollTo to parent ref for external compatibility
  useImperativeHandle(mobileCarouselRef as any, () => ({
    scrollTo: (opts: any) => {
      const idx = opts?.index ?? (opts?.x != null ? Math.round(opts.x / itemSize) : 0);
      carouselRef.current?.scrollTo({ index: idx, animated: opts?.animated !== false });
      setIndex(idx);
    },
  }));

  // Synchronize with external selectedTab updates
  useEffect(() => {
    const targetIdx = selectedTab === "SPIN" ? 0 : selectedTab === "XO_GAME" ? 1 : 2;
    if (targetIdx !== index) {
      carouselRef.current?.scrollTo({ index: targetIdx, animated: true });
      setIndex(targetIdx);
    }
  }, [selectedTab]);

  // Guaranteed initial alignment to selectedTab on mount
  useEffect(() => {
    const targetIdx = selectedTab === "SPIN" ? 0 : selectedTab === "XO_GAME" ? 1 : 2;
    const timer = setTimeout(() => {
      carouselRef.current?.scrollTo({ index: targetIdx, animated: false });
      setIndex(targetIdx);
    }, 70);
    return () => clearTimeout(timer);
  }, []);

  const handleTabPress = (tab: MobileCardMode) => {
    try { playTickSound(); } catch {}
    haptics.impact();
    const idx = tab === "SPIN" ? 0 : tab === "XO_GAME" ? 1 : 2;
    carouselRef.current?.scrollTo({ index: idx, animated: true });
    setIndex(idx);
    setSelectedTab(tab);
    setActiveGameMode(tab === "SPIN" ? "spin" : "xo");
    router.setParams({ tab });
  };

  // 3D Card Sliding Animation (react-native-reanimated-carousel ItemAnimation spec)
  const itemAnimation = useCallback<CarouselItemAnimation>(
    (value) => {
      "worklet";
      const d = Math.abs(value);
      return {
        transform: [
          { translateX: value * itemSize + (width - itemSize) / 2 },
          { translateY: interpolate(d, [0, 1], [0, 14], Extrapolation.CLAMP) },
          { scale: interpolate(d, [0, 1], [1, 0.90], Extrapolation.CLAMP) },
        ],
        zIndex: Math.round(100 - d * 10),
        opacity: interpolate(d, [0, 1], [1, 0.65], Extrapolation.CLAMP),
      };
    },
    [width, itemSize]
  );

  const renderSpinCard = () => (
    <View style={{ width: cardWidth, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          backgroundColor: "#110714",
          borderRadius: 26,
          borderWidth: 1.5,
          borderColor: "rgba(255, 42, 95, 0.65)",
          padding: 16,
          paddingTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image
          source={spinBgRedImg}
          style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%", opacity: 0.95 }]}
          resizeMode="cover"
        />

        {/* Top Badge Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 8 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(255, 42, 95, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(255, 42, 95, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="aperture" size={13} color="#ff2a5f" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>
              SPIN
            </Text>
          </View>

          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "rgba(255, 42, 95, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(255, 42, 95, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="flame" size={13} color="#ff2a5f" />
            <Text style={{ color: "#ff2a5f", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 }}>
              POPULAR
            </Text>
          </View>
        </View>

        {/* Artwork Image: spin-card bord.webp */}
        <View style={{ width: "100%", height: 265, alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
          <Image
            source={spinCardBordImg}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: 4, marginBottom: 14 }}>
          <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            SPIN <Text style={{ color: "#ff2a5f" }}>&</Text> WIN
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 12.5, fontWeight: "600", marginTop: 4 }}>
            {isEN ? "Big prizes are waiting!" : "ትላልቅ ሽልማቶች ይጠብቁዎታል!"}
          </Text>
        </View>

        {/* Inner Card Button: [ ▶ REAL SPIN ] */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            haptics.impact();
            setSpinBetModalVisible(true);
          }}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(255, 42, 95, 0.45)",
          } as any}
        >
          <LinearGradient
            colors={["#ff2a5f", "#c01048"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="play" size={17} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
              {isEN ? "REAL SPIN" : "እሽክርክሪት ጀምር"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status: 5 PLAYERS • REAL TIME */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 12,
        marginTop: 14,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="people" size={13} color="#ff2a5f" />
          <Text style={{ color: "#ff2a5f", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            5 PLAYERS
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
          <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            REAL TIME
          </Text>
        </View>
      </View>

      {/* Outer Button: [ 5 Players Room > ] */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          haptics.impact();
          router.push({
            pathname: "/(authed)/home/spin",
            params: { mode: "5_PLAYER" },
          } as any);
        }}
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(22, 16, 32, 0.85)",
          borderRadius: 20,
          borderWidth: 1.2,
          borderColor: "rgba(255, 42, 95, 0.35)",
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: -6 }}>
          {["#FF1744", "#00DAF3", "#7C3AED", "#10B981"].map((c, i) => (
            <View key={i} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: "#ff2a5f", backgroundColor: c, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900" }}>P{i+1}</Text>
            </View>
          ))}
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: "rgba(255, 42, 95, 0.6)", backgroundColor: "rgba(255, 42, 95, 0.2)", alignItems: "center", justifyContent: "center", borderStyle: "dashed" }}>
            <Ionicons name="add" size={13} color="#ff2a5f" />
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 }}>
            {isEN ? "5 Players Room" : "የ 5 ተጫዋች ክፍል"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#ff2a5f" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderXoCard = () => (
    <View style={{ width: cardWidth, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          backgroundColor: "#07121c",
          borderRadius: 26,
          borderWidth: 1.5,
          borderColor: "rgba(0, 218, 243, 0.65)",
          padding: 16,
          paddingTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image
          source={xoBgBlueImg}
          style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%", opacity: 0.95 }]}
          resizeMode="cover"
        />

        {/* Top Badge Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 8 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(0, 218, 243, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(0, 218, 243, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="grid" size={13} color="#00daf3" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>
              XO
            </Text>
          </View>

          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "rgba(0, 218, 243, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(0, 218, 243, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="star" size={13} color="#00daf3" />
            <Text style={{ color: "#00daf3", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 }}>
              CLASSIC
            </Text>
          </View>
        </View>

        {/* Artwork Image: xo-card bord.webp */}
        <View style={{ width: "100%", height: 265, alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
          <Image
            source={xoCardBordImg}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: 4, marginBottom: 14 }}>
          <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            XO BATTLE
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 12.5, fontWeight: "600", marginTop: 4 }}>
            {isEN ? "Think. Move. Win." : "አስብ። ተንቀሳቀስ። አሸንፍ።"}
          </Text>
        </View>

        {/* Inner Card Button: [ ▶ PLAY NOW ] */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            haptics.impact();
            openRoomSheet();
          }}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0, 218, 243, 0.45)",
          } as any}
        >
          <LinearGradient
            colors={["#00daf3", "#0284c7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="play" size={17} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
              {isEN ? "PLAY NOW" : "አሁን ተጫወት"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status: 2 PLAYERS • REAL TIME */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 12,
        marginTop: 14,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="people" size={13} color="#00daf3" />
          <Text style={{ color: "#00daf3", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            2 PLAYERS
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
          <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            REAL TIME
          </Text>
        </View>
      </View>

      {/* Outer Button: [ Play with Friends > ] */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          haptics.impact();
          openRoomSheet("FRIENDS");
        }}
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(10, 24, 38, 0.85)",
          borderRadius: 20,
          borderWidth: 1.2,
          borderColor: "rgba(0, 218, 243, 0.35)",
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="people" size={18} color="#00daf3" />
          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 }}>
            {isEN ? "PLAY WITH FRIEND" : "ከጓደኛ ጋር ተጫወት"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#00daf3" />
      </TouchableOpacity>
    </View>
  );

  const renderSoonCard = () => (
    <View style={{ width: cardWidth, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          backgroundColor: "#0d1522",
          borderRadius: 26,
          borderWidth: 1.5,
          borderColor: "rgba(148, 163, 184, 0.35)",
          padding: 16,
          paddingTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Badge Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 8 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(148, 163, 184, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(148, 163, 184, 0.4)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="sparkles" size={13} color="#94a3b8" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>
              NEW ARENA
            </Text>
          </View>

          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "rgba(245, 158, 11, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.4)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="flask" size={13} color="#f59e0b" />
            <Text style={{ color: "#f59e0b", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 }}>
              IN LAB
            </Text>
          </View>
        </View>

        {/* Mystery Portal Graphic */}
        <View style={{ width: "100%", height: 245, alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
          <View style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "rgba(30, 41, 59, 0.6)",
            borderWidth: 2,
            borderColor: "rgba(148, 163, 184, 0.35)",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}>
            <View style={{
              position: "absolute",
              width: 164,
              height: 164,
              borderRadius: 82,
              borderWidth: 1,
              borderColor: "rgba(148, 163, 184, 0.15)",
              borderStyle: "dashed",
            }} />
            <Ionicons name="sparkles" size={56} color="#94a3b8" />
            <View style={{
              position: "absolute",
              bottom: -8,
              backgroundColor: "#1e293b",
              paddingHorizontal: 12,
              paddingVertical: 3,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#475569",
            }}>
              <Text style={{ color: "#cbd5e1", fontSize: 9.5, fontWeight: "900", letterSpacing: 1 }}>
                UPCOMING
              </Text>
            </View>
          </View>
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: 4, marginBottom: 14 }}>
          <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            NEW ARENA
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 12.5, fontWeight: "600", marginTop: 4 }}>
            {isEN ? "Next multiplayer mode in development" : "አዲስ የጨዋታ አይነት በቅርቡ ይለቀቃል"}
          </Text>
        </View>

        {/* Inner Card Button: [ 🔒 SOON ] (Updated to SOON per user request) */}
        <View
          style={{
            width: "100%",
            height: 50,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            borderWidth: 1,
            borderColor: "rgba(148, 163, 184, 0.3)",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Ionicons name="lock-closed" size={17} color="#94a3b8" />
          <Text style={{ color: "#94a3b8", fontSize: 14, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
            {isEN ? "SOON" : "በቅርብ"}
          </Text>
        </View>
      </View>

      {/* Status: 4 PLAYERS • NEXT EXPANSION */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 12,
        marginTop: 14,
        marginBottom: 10,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="people" size={13} color="#94a3b8" />
          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            4 PLAYERS
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#f59e0b" }} />
          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
            NEXT EXPANSION
          </Text>
        </View>
      </View>

      {/* Outer Button: [ ⏳ Stay Tuned for Release ] */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(18, 24, 44, 0.5)",
          borderRadius: 20,
          borderWidth: 1.2,
          borderColor: "rgba(148, 163, 184, 0.25)",
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="time-outline" size={17} color="#94a3b8" />
          <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 }}>
            {isEN ? "Stay Tuned for Release" : "በቅርብ ይጠብቁን"}
          </Text>
        </View>
        <Ionicons name="lock-closed" size={14} color="#64748b" />
      </View>
    </View>
  );

  const renderItem = useCallback<CarouselRenderItem<MobileCardMode>>(
    ({ item }) => {
      if (item === "SPIN") return renderSpinCard();
      if (item === "XO_GAME") return renderXoCard();
      return renderSoonCard();
    },
    [isEN, openRoomSheet, setSpinBetModalVisible]
  );

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* Top 3 Mode Switcher Tabs [ SPIN ] [ XO ] [ SOON ] (Updated to SOON on phone per user request) */}
      <View style={[styles.topTabsBar, { width: Math.min(width - 24, 380) }]}>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => handleTabPress("SPIN")}
          style={[styles.tabBtn, selectedTab === "SPIN" && styles.tabActiveSpin]}
        >
          <Ionicons
            name="aperture"
            size={15}
            color={selectedTab === "SPIN" ? "#FFFFFF" : "#8893a7"}
          />
          <Text style={[styles.tabBtnText, selectedTab === "SPIN" && styles.tabBtnTextActive]}>
            {isEN ? "SPIN" : "እሽክርክሪት"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => handleTabPress("XO_GAME")}
          style={[styles.tabBtn, selectedTab === "XO_GAME" && styles.tabActiveXO]}
        >
          <Ionicons
            name="grid"
            size={14}
            color={selectedTab === "XO_GAME" ? "#080F17" : "#94a3b8"}
          />
          <Text style={[styles.tabBtnText, selectedTab === "XO_GAME" ? { color: "#080F17", fontWeight: "900" } : null]}>
            {isEN ? "XO" : "ኤክስ ኦ"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => handleTabPress("COMING_SOON")}
          style={[styles.tabBtn, selectedTab === "COMING_SOON" && styles.tabActiveSoon]}
        >
          <Ionicons
            name="cube-outline"
            size={14}
            color={selectedTab === "COMING_SOON" ? "#FFFFFF" : "#8893a7"}
          />
          <Text style={[styles.tabBtnText, selectedTab === "COMING_SOON" && styles.tabBtnTextActive]}>
            {isEN ? "SOON" : "በቅርብ"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reanimated Carousel with 3D Item Animation */}
      <View style={{ width: "100%", height: 575, marginTop: 4, alignItems: "center" }}>
        <Carousel
          ref={carouselRef}
          loop={true}
          defaultIndex={initialIndex}
          data={CARDS}
          style={{ width, height: 575 }}
          itemSize={itemSize}
          itemAnimation={itemAnimation}
          animation={{
            type: "timing",
            duration: 380,
            easing: Easing.out(Easing.poly(4)),
          }}
          progress={progress}
          onSnapToItem={(rawIdx) => {
            const idx = ((rawIdx % CARDS.length) + CARDS.length) % CARDS.length;
            setIndex(idx);
            const newTab = CARDS[idx];
            if (newTab !== selectedTab) {
              try { playTickSound(); } catch {}
              haptics.impact();
              setSelectedTab(newTab);
              setActiveGameMode(idx === 0 ? "spin" : "xo");
              router.setParams({ tab: newTab });
            }
          }}
          renderItem={renderItem}
        />
      </View>

      {/* Pagination Component */}
      <Pagination
        count={CARDS.length}
        progress={progress}
        containerStyle={{ gap: 8, marginTop: 14, marginBottom: 12, alignSelf: "center" }}
        dotStyle={{ width: 8, height: 7, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.25)" }}
        activeDotStyle={{
          width: 24,
          height: 7,
          borderRadius: 4,
          backgroundColor: index === 0 ? "#ff2a5f" : index === 1 ? "#00daf3" : "#94a3b8",
        }}
        onPress={(i) => handleTabPress(CARDS[i])}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  topTabsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#1E293B",
    borderRadius: 18,
    padding: 5,
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  tabActiveSpin: {
    backgroundColor: "#ff2a5f",
    boxShadow: "0 2px 10px rgba(255, 42, 95, 0.45)",
  } as any,
  tabActiveXO: {
    backgroundColor: "#00daf3",
    boxShadow: "0 2px 10px rgba(0, 218, 243, 0.45)",
  } as any,
  tabActiveSoon: {
    backgroundColor: "#223147",
    boxShadow: "0 2px 8px rgba(34, 49, 71, 0.4)",
  } as any,
  tabBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8893a7",
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
});
