import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
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

export type MobileCardMode = "SPIN" | "XO_GAME" | "RPS" | "COMING_SOON";
const CARDS: MobileCardMode[] = ["SPIN", "XO_GAME", "RPS"];

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
  setRpsBetModalVisible?: (visible: boolean) => void;
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
  setRpsBetModalVisible,
  openRoomSheet,
}) => {
  const { height: winH } = useWindowDimensions();
  const isCompactHeight = winH < 780;
  const carouselHeight = isCompactHeight ? 485 : 575;
  const artHeight = isCompactHeight ? 200 : 265;
  const soonArtHeight = isCompactHeight ? 185 : 245;
  const headlineFontSize = isCompactHeight ? 26 : 32;
  const cardPadding = isCompactHeight ? 12 : 16;

  const safeWidth = Math.max(width || 360, 320);
  const itemSize = Math.min(safeWidth * 0.78, 315);
  const cardWidth = Math.min(itemSize, 305);

  const carouselRef = useRef<CarouselRef>(null);
  const initialIndex = selectedTab === "SPIN" ? 0 : selectedTab === "XO_GAME" ? 1 : 2;
  const [index, setIndex] = useState(initialIndex);
  const progress = useSharedValue(initialIndex);

  // Expose scrollTo to parent ref for external compatibility with defensive bounds
  useImperativeHandle(mobileCarouselRef as any, () => ({
    scrollTo: (opts: any) => {
      let idx = 0;
      if (typeof opts?.index === "number" && !isNaN(opts.index) && isFinite(opts.index)) {
        idx = opts.index;
      } else if (typeof opts?.x === "number" && itemSize > 0) {
        idx = Math.round(opts.x / itemSize);
      }
      if (isNaN(idx) || !isFinite(idx)) idx = 0;
      idx = Math.max(0, Math.min(CARDS.length - 1, idx));
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

  // Guaranteed initial alignment to selectedTab on mount (prevents intermediate void offset)
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
          padding: cardPadding,
          paddingTop: isCompactHeight ? 10 : 14,
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: isCompactHeight ? 4 : 8 }}>
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
        <View style={{ width: "100%", height: artHeight, alignItems: "center", justifyContent: "center", marginVertical: isCompactHeight ? 2 : 4 }}>
          <Image
            source={spinCardBordImg}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: isCompactHeight ? 2 : 4, marginBottom: isCompactHeight ? 8 : 14 }}>
          <Text style={{ color: "#ffffff", fontSize: headlineFontSize, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            SPIN <Text style={{ color: "#ff2a5f" }}>&</Text> WIN
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: isCompactHeight ? 11.5 : 12.5, fontWeight: "600", marginTop: 2 }}>
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
          padding: cardPadding,
          paddingTop: isCompactHeight ? 10 : 14,
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: isCompactHeight ? 4 : 8 }}>
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
        <View style={{ width: "100%", height: artHeight, alignItems: "center", justifyContent: "center", marginVertical: isCompactHeight ? 2 : 4 }}>
          <Image
            source={xoCardBordImg}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: isCompactHeight ? 2 : 4, marginBottom: isCompactHeight ? 8 : 14 }}>
          <Text style={{ color: "#ffffff", fontSize: headlineFontSize, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            XO BATTLE
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: isCompactHeight ? 11.5 : 12.5, fontWeight: "600", marginTop: 2 }}>
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

  const renderRpsCard = () => (
    <View style={{ width: cardWidth, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          backgroundColor: "#130f24",
          borderRadius: 26,
          borderWidth: 1.5,
          borderColor: "rgba(245, 158, 11, 0.65)",
          padding: cardPadding,
          paddingTop: isCompactHeight ? 10 : 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Dark Gradient Background */}
        <LinearGradient
          colors={["#1e1438", "#120d24", "#0a0715"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Top Badge Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: isCompactHeight ? 4 : 8 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(245, 158, 11, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <FontAwesome5 name="hand-scissors" size={12} color="#f59e0b" />
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>
              RPS ARENA
            </Text>
          </View>

          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "rgba(245, 158, 11, 0.18)",
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.5)",
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Ionicons name="flash" size={13} color="#f59e0b" />
            <Text style={{ color: "#f59e0b", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 }}>
              1V1 BATTLE
            </Text>
          </View>
        </View>

        {/* Artwork: Interactive 3-Hand Battle Arena */}
        <View style={{ width: "100%", height: soonArtHeight, alignItems: "center", justifyContent: "center", marginVertical: isCompactHeight ? 2 : 4 }}>
          <View style={{
            width: isCompactHeight ? 170 : 200,
            height: isCompactHeight ? 116 : 140,
            borderRadius: 24,
            backgroundColor: "rgba(26, 18, 48, 0.7)",
            borderWidth: 1.5,
            borderColor: "rgba(245, 158, 11, 0.35)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
            paddingHorizontal: 8,
          }}>
            {/* Rock */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{
                width: isCompactHeight ? 40 : 48,
                height: isCompactHeight ? 40 : 48,
                borderRadius: isCompactHeight ? 20 : 24,
                backgroundColor: "rgba(255, 42, 95, 0.15)",
                borderWidth: 1.5,
                borderColor: "#ff2a5f",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <FontAwesome5 name="hand-rock" size={isCompactHeight ? 18 : 22} color="#ff2a5f" />
              </View>
              <Text style={{ color: "#cbd5e1", fontSize: 9.5, fontWeight: "800" }}>ROCK</Text>
            </View>

            {/* Paper */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{
                width: isCompactHeight ? 40 : 48,
                height: isCompactHeight ? 40 : 48,
                borderRadius: isCompactHeight ? 20 : 24,
                backgroundColor: "rgba(0, 218, 243, 0.15)",
                borderWidth: 1.5,
                borderColor: "#00daf3",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <FontAwesome5 name="hand-paper" size={isCompactHeight ? 18 : 22} color="#00daf3" />
              </View>
              <Text style={{ color: "#cbd5e1", fontSize: 9.5, fontWeight: "800" }}>PAPER</Text>
            </View>

            {/* Scissors */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{
                width: isCompactHeight ? 40 : 48,
                height: isCompactHeight ? 40 : 48,
                borderRadius: isCompactHeight ? 20 : 24,
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                borderWidth: 1.5,
                borderColor: "#f59e0b",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <FontAwesome5 name="hand-scissors" size={isCompactHeight ? 18 : 22} color="#f59e0b" />
              </View>
              <Text style={{ color: "#cbd5e1", fontSize: 9.5, fontWeight: "800" }}>SCISSORS</Text>
            </View>
          </View>
        </View>

        {/* Headline & Subtitle */}
        <View style={{ alignItems: "center", marginTop: isCompactHeight ? 2 : 4, marginBottom: isCompactHeight ? 8 : 14 }}>
          <Text style={{ color: "#ffffff", fontSize: headlineFontSize, fontWeight: "900", fontFamily: "Inter, sans-serif", letterSpacing: 0.5 }}>
            RPS BATTLE
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: isCompactHeight ? 11.5 : 12.5, fontWeight: "600", marginTop: 2 }}>
            {isEN ? "Rock • Paper • Scissors" : "ሮክ • ፔፐር • ሲዘርስ"}
          </Text>
        </View>

        {/* Inner Card Button: [ ▶ PLAY NOW ] */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            haptics.impact();
            if (setRpsBetModalVisible) {
              setRpsBetModalVisible(true);
            } else {
              router.push("/(authed)/games/rps");
            }
          }}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(245, 158, 11, 0.45)",
          } as any}
        >
          <LinearGradient
            colors={["#f59e0b", "#d97706"]}
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
          <Ionicons name="people" size={13} color="#f59e0b" />
          <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
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
          backgroundColor: "rgba(22, 17, 36, 0.85)",
          borderRadius: 20,
          borderWidth: 1.2,
          borderColor: "rgba(245, 158, 11, 0.35)",
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="people" size={18} color="#f59e0b" />
          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 }}>
            {isEN ? "PLAY WITH FRIEND" : "ከጓደኛ ጋር ተጫወት"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = useCallback<CarouselRenderItem<MobileCardMode>>(
    ({ item }) => {
      if (item === "SPIN") return renderSpinCard();
      if (item === "XO_GAME") return renderXoCard();
      return renderRpsCard();
    },
    [isEN, openRoomSheet, setSpinBetModalVisible, setRpsBetModalVisible, router]
  );

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* Top 3 Mode Switcher Tabs [ SPIN ] [ XO ] [ RPS ] */}
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
          onPress={() => handleTabPress("RPS")}
          style={[styles.tabBtn, (selectedTab === "RPS" || selectedTab === "COMING_SOON") && styles.tabActiveRPS]}
        >
          <FontAwesome5
            name="hand-scissors"
            size={13}
            color={(selectedTab === "RPS" || selectedTab === "COMING_SOON") ? "#080F17" : "#8893a7"}
          />
          <Text style={[styles.tabBtnText, (selectedTab === "RPS" || selectedTab === "COMING_SOON") ? { color: "#080F17", fontWeight: "900" } : null]}>
            RPS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reanimated Carousel with 3D Item Animation */}
      <View style={{ width: "100%", height: carouselHeight, marginTop: 4, alignItems: "center" }}>
        <Carousel
          ref={carouselRef}
          loop={false}
          renderWindowSize={3}
          defaultIndex={initialIndex}
          data={CARDS}
          style={{ width: safeWidth, height: carouselHeight }}
          itemSize={itemSize}
          itemAnimation={itemAnimation}
          animation={{
            type: "timing",
            duration: 380,
            easing: Easing.out(Easing.poly(4)),
          }}
          progress={progress}
          onSnapToItem={(rawIdx) => {
            const idx = Math.max(0, Math.min(CARDS.length - 1, rawIdx));
            setIndex(idx);
            const newTab = CARDS[idx];
            if (newTab !== selectedTab) {
              try { playTickSound(); } catch {}
              haptics.impact();
              setSelectedTab(newTab);
              setActiveGameMode(idx === 0 ? "spin" : idx === 1 ? "xo" : "rps");
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
          backgroundColor: index === 0 ? "#ff2a5f" : index === 1 ? "#00daf3" : "#f59e0b",
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
  tabActiveRPS: {
    backgroundColor: "#f59e0b",
    boxShadow: "0 2px 10px rgba(245, 158, 11, 0.45)",
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
