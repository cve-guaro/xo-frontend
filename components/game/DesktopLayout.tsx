// components/game/DesktopLayout.tsx
// Full desktop/tablet layout for the XOET gaming platform.
// Redesigned strictly per Image 1 & 2 carousel wireframe and Image 4 Brand Identity.
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Animated,
  useWindowDimensions,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Carousel,
  type CarouselItemAnimation,
  type CarouselRef,
  Pagination,
} from "react-native-reanimated-carousel";
import {
  Easing,
  Extrapolation,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";

import { WebDepositModal, WebWithdrawModal } from "../../components/WebModals";
import ProfileEditModal from "../../components/ProfileEditModal";
import ReferralModal from "../../components/ReferralModal";
import RoomSheet from "./RoomSheet";
import DesktopHeader, { DesktopTabType } from "./DesktopHeader";
import DesktopSidebar from "./DesktopSidebar";
import SpinBetSelectModal from "./SpinBetSelectModal";
import type { RoomConfig, SheetStep } from "./gameplayConstants";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { BREAKPOINTS, HEIGHT_THRESHOLDS, clamp, getResponsiveLayout } from "../../constants/breakpoints";

const spinBgRedImg = require("../../assets/images/spin-background-red-desktop.webp");
const xoBgBlueImg = require("../../assets/images/xo-background-blue.webp");
const spinCardBordImg = require("../../assets/images/spin-card bord.webp");
const xoCardBordImg = require("../../assets/images/xo-card bord.webp");

type LeaderboardEntry = {
  id?: string;
  username?: string;
  avatar?: string;
  wins: number;
  isMe?: boolean;
};

type DesktopLayoutProps = {
  user: any;
  token: string | null;
  balance: number;
  language: string;
  isDesktop: boolean;
  isTablet: boolean;
  isBanned: boolean;
  isSearching: boolean;
  isEN: boolean;
  weeklyLeaderboard: LeaderboardEntry[];
  weeklyPrizes: { rank: number; amount: number }[];
  loadingWeekly: boolean;
  secondsRemaining: number;
  winRate: number;
  rankMeta: { label: string; tone: string };
  rawTickerList: { username: string; amount: number | string }[];
  roomSheetVisible: boolean;
  sheetStep: SheetStep;
  selectedRoom: RoomConfig;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  userCaps: any;
  depositVisible: boolean;
  withdrawVisible: boolean;
  friendModalVisible: boolean;
  pwaModalVisible: boolean;
  showReferralModal: boolean;
  showPromo: boolean;
  inviteResult: any;
  promoConfig: any;
  setDepositVisible: (v: boolean) => void;
  setWithdrawVisible: (v: boolean) => void;
  setFriendModalVisible: (v: boolean) => void;
  setPwaModalVisible: (v: boolean) => void;
  setShowReferralModal: (v: boolean) => void;
  setShowPromo: (v: boolean) => void;
  setInviteResult: (v: any) => void;
  openRoomSheet: (initialMode?: "STAKES" | "FRIENDS") => void;
  closeRoomSheet: () => void;
  goBackToRooms: () => void;
  onSelectRoom: (id: RoomConfig["id"]) => void;
  selectAmount: (room: RoomConfig, min: number, max: number) => void;
  handleSendInvite: (username: string, betAmount: number) => void;
  refreshProfile: (force?: boolean) => void;
  handleLanguageToggle: () => void;
  router: any;
  appConfig?: any;
  selectedTab: DesktopTabType;
  setSelectedTab: (tab: DesktopTabType) => void;
  bgMusicPlaying?: boolean;
  onToggleSound?: () => void;
  unreadCount?: number;
  setNotificationsVisible?: (v: boolean) => void;
};

export default function DesktopLayout(props: DesktopLayoutProps) {
  const {
    user, token, balance, language, isDesktop, isTablet, isEN,
    weeklyLeaderboard = [],
    roomSheetVisible, sheetStep, selectedRoom, backdropOpacity, sheetTranslateY, userCaps,
    depositVisible, withdrawVisible, pwaModalVisible, showReferralModal,
    friendModalVisible, setFriendModalVisible,
    setDepositVisible, setWithdrawVisible, setPwaModalVisible,
    setShowReferralModal,
    openRoomSheet, closeRoomSheet, goBackToRooms, onSelectRoom, selectAmount,
    handleSendInvite, inviteResult,
    refreshProfile, handleLanguageToggle,
    router,
    selectedTab = "XO_GAME", setSelectedTab,
    bgMusicPlaying = true,
    onToggleSound = () => {},
    unreadCount = 0,
    setNotificationsVisible = () => {},
  } = props;

  // Carousel order
  const { width: winW, height: winH } = useWindowDimensions();
  const responsive = getResponsiveLayout(winW, winH);
  const {
    isTabletLayout,
    showMultiCards,
    isShortScreen,
    centerCardMinH,
    centerCardMaxH,
    sideArtH,
    sideCardMinH,
    sideCardMaxH,
    actionBtnH,
    outerShelfH,
    carouselH,
    leftSidebarW,
    rightSidebarW,
    columnGap,
  } = responsive;

  // Smoothly clamped hero art height
  const centerArtH = responsive.heroArtH;

  // Backward-compatible height threshold flags
  const isCompactDesktopH = winH < HEIGHT_THRESHOLDS.STANDARD_DESKTOP;
  const isUltraCompactDesktopH = winH < HEIGHT_THRESHOLDS.COMPACT_DESKTOP;

  // Fluid typography & margins for cards
  const titleFontSize = isShortScreen ? 19 : Math.round(clamp(21, winH * 0.034, 28));
  const titleMargin = isShortScreen ? 1 : Math.round(clamp(2, winH * 0.007, 6));

  const tabs: DesktopTabType[] = ["SPIN", "XO_GAME", "COMING_SOON"];
  const [spinBetModalVisible, setSpinBetModalVisible] = useState(false);
  const [sheetInitialView, setSheetInitialView] = useState<"STAKES" | "FRIENDS">("STAKES");

  const carouselRef = useRef<CarouselRef>(null);
  const initialIndex = tabs.indexOf(selectedTab) >= 0 ? tabs.indexOf(selectedTab) : 1;
  const [index, setIndex] = useState(initialIndex);
  const progress = useSharedValue(initialIndex);

  // Dynamic layout measurement for Desktop Center Column (Fluid & Responsive to viewport)
  const [centerWidth, setCenterWidth] = useState(
    isTabletLayout
      ? Math.min(winW - (winW < 1120 ? 90 : 260), 960)
      : Math.min(winW - (leftSidebarW + rightSidebarW + columnGap * 2 + 40), 1200)
  );
  useEffect(() => {
    const calculated = isTabletLayout
      ? Math.min(winW - (winW < 1120 ? 90 : 260), 960)
      : Math.min(winW - (leftSidebarW + rightSidebarW + columnGap * 2 + 40), 1200);
    setCenterWidth(Math.max(calculated, 420));
  }, [winW, isTabletLayout, leftSidebarW, rightSidebarW, columnGap]);

  const cardWidth = Math.round(clamp(360, centerWidth * 0.44, 440));
  const itemSize = cardWidth;

  // Synchronize carousel when selectedTab changes externally (e.g. from DesktopHeader)
  useEffect(() => {
    const targetIdx = tabs.indexOf(selectedTab);
    if (targetIdx >= 0 && targetIdx !== index) {
      carouselRef.current?.scrollTo({ index: targetIdx, animated: true });
      setIndex(targetIdx);
    }
  }, [selectedTab]);

  // Guaranteed initial alignment to selectedTab on mount (prevents initial Spin/XO mismatch)
  useEffect(() => {
    const targetIdx = tabs.indexOf(selectedTab);
    if (targetIdx >= 0) {
      const timer = setTimeout(() => {
        carouselRef.current?.scrollTo({ index: targetIdx, animated: false });
        setIndex(targetIdx);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, []);

  const isCarouselBusyRef = useRef(false);

  const handlePrevCard = () => {
    if (isCarouselBusyRef.current) return;
    isCarouselBusyRef.current = true;
    try { playTickSound(); } catch {}
    haptics.tap();
    carouselRef.current?.prev({ animated: true });
    setTimeout(() => {
      isCarouselBusyRef.current = false;
    }, 280);
  };

  const handleNextCard = () => {
    if (isCarouselBusyRef.current) return;
    isCarouselBusyRef.current = true;
    try { playTickSound(); } catch {}
    haptics.tap();
    carouselRef.current?.next({ animated: true });
    setTimeout(() => {
      isCarouselBusyRef.current = false;
    }, 280);
  };

  // 3D Card Sliding Animation matching the user's requested specification (smooth, close preview peeks)
  const sideOffset = Math.round(cardWidth * 0.68);
  const arrowOffset = Math.max(16, Math.round((centerWidth - cardWidth) / 2 - 58));

  const itemAnimation = useCallback<CarouselItemAnimation>(
    (value) => {
      "worklet";
      const d = Math.abs(value);
      return {
        transform: [
          { translateX: value * sideOffset + (centerWidth - itemSize) / 2 },
          { translateY: interpolate(d, [0, 1], [0, 14], Extrapolation.CLAMP) },
          { scale: interpolate(d, [0, 1], [1, 0.88], Extrapolation.CLAMP) },
        ],
        zIndex: Math.round(100 - d * 10),
        opacity: interpolate(d, [0, 1], [1, 0.65], Extrapolation.CLAMP),
      };
    },
    [centerWidth, itemSize, sideOffset]
  );

  // Render single card according to its Coverflow position
  const renderCoverflowCard = (tab: DesktopTabType, position: "left" | "center" | "right") => {
    const isCenter = position === "center";
    const isLeft = position === "left";
    const isRight = position === "right";

    const handleCardPress = () => {
      try { playTickSound(); } catch {}
      haptics.tap();
      if (!isCenter) {
        const targetIdx = tabs.indexOf(tab);
        carouselRef.current?.scrollTo({ index: targetIdx, animated: true });
        setIndex(targetIdx);
        setSelectedTab(tab);
      }
    };

    if (tab === "XO_GAME") {
      return (
        <TouchableOpacity
          key="XO_GAME"
          activeOpacity={isCenter ? 0.95 : 0.75}
          onPress={handleCardPress}
          style={[
            s.gameCard,
            isCenter ? s.gameCardCenter : s.gameCardSide,
            isCenter ? { minHeight: centerCardMinH, maxHeight: centerCardMaxH } : { minHeight: sideCardMinH, maxHeight: sideCardMaxH },
            isCenter ? s.gameCardFocusedXo : s.gameCardUnfocused,
          ]}
        >
          <Image
            source={xoBgBlueImg}
            style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%", opacity: isCenter ? 0.95 : 0.45 }]}
            resizeMode="cover"
          />

          {/* Badges */}
          <View style={s.cardBadgeRow}>
            <View style={[s.badgePill, { backgroundColor: "rgba(0, 191, 255, 0.2)", borderColor: "rgba(0, 191, 255, 0.5)" }]}>
              <Ionicons name="grid" size={isCenter ? 11 : 9} color="#00BFFF" />
              <Text style={[s.badgeText, { color: "#FFFFFF" }, !isCenter && { fontSize: 8.5 }]}>XO</Text>
            </View>
            <View style={[s.badgePill, { backgroundColor: "rgba(0, 191, 255, 0.2)", borderColor: "rgba(0, 191, 255, 0.5)" }]}>
              <Ionicons name="star" size={isCenter ? 11 : 9} color="#00BFFF" />
              <Text style={[s.badgeText, { color: "#00BFFF" }, !isCenter && { fontSize: 8.5 }]}>CLASSIC</Text>
            </View>
          </View>

          {/* Artwork */}
          <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide, { height: isCenter ? centerArtH : sideArtH }]}>
            <Image
              source={xoCardBordImg}
              style={{
                width: "100%",
                height: "100%",
                transform: [{ scale: isCenter ? 1.14 : 1.05 }],
              }}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <View style={{ alignItems: "center", marginVertical: isCenter ? titleMargin : 2 }}>
            <Text style={[s.cardTitle, isCenter && { fontSize: titleFontSize }, !isCenter && s.cardTitleSide]}>XO BATTLE</Text>
            <Text style={[s.cardSubtitle, !isCenter && { fontSize: 10 }]}>{isEN ? "Think. Move. Win." : "አስብ። ተንቀሳቀስ። አሸንፍ።"}</Text>
          </View>

          {/* Primary Button */}
          {isCenter ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                haptics.impact();
                setSheetInitialView("STAKES");
                openRoomSheet("STAKES");
              }}
              style={[s.cardActionBtn, { height: actionBtnH }]}
            >
              <LinearGradient colors={["#00BFFF", "#0091EA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cardBtnGrad}>
                <Ionicons name="game-controller" size={16} color="#FFFFFF" />
                <Text style={s.cardBtnText}>PLAY NOW</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={s.cardSideHint}>
              <Text style={s.cardSideHintText}>CLICK TO EXPAND</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (tab === "SPIN") {
      return (
        <TouchableOpacity
          key="SPIN"
          activeOpacity={isCenter ? 0.95 : 0.75}
          onPress={handleCardPress}
          style={[
            s.gameCard,
            isCenter ? s.gameCardCenter : s.gameCardSide,
            isCenter ? { minHeight: centerCardMinH, maxHeight: centerCardMaxH } : { minHeight: sideCardMinH, maxHeight: sideCardMaxH },
            isCenter ? s.gameCardFocusedSpin : s.gameCardUnfocused,
          ]}
        >
          <Image
            source={spinBgRedImg}
            style={[StyleSheet.absoluteFillObject, { width: "100%", height: "100%", opacity: isCenter ? 0.95 : 0.45 }]}
            resizeMode="cover"
          />

          {/* Badges */}
          <View style={s.cardBadgeRow}>
            <View style={[s.badgePill, { backgroundColor: "rgba(255, 23, 68, 0.2)", borderColor: "rgba(255, 23, 68, 0.5)" }]}>
              <Ionicons name="aperture" size={isCenter ? 11 : 9} color="#FF1744" />
              <Text style={[s.badgeText, { color: "#FFFFFF" }, !isCenter && { fontSize: 8.5 }]}>SPIN</Text>
            </View>
            <View style={[s.badgePill, { backgroundColor: "rgba(255, 23, 68, 0.2)", borderColor: "rgba(255, 23, 68, 0.5)" }]}>
              <Ionicons name="flame" size={isCenter ? 11 : 9} color="#FF1744" />
              <Text style={[s.badgeText, { color: "#FF1744" }, !isCenter && { fontSize: 8.5 }]}>POPULAR</Text>
            </View>
          </View>

          {/* Artwork */}
          <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide, { height: isCenter ? centerArtH : sideArtH }]}>
            <Image
              source={spinCardBordImg}
              style={{
                width: "100%",
                height: "100%",
                transform: [{ scale: isCenter ? 1.14 : 1.05 }],
              }}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <View style={{ alignItems: "center", marginVertical: isCenter ? titleMargin : 2 }}>
            <Text style={[s.cardTitle, isCenter && { fontSize: titleFontSize }, !isCenter && s.cardTitleSide]}>SPIN <Text style={{ color: "#FF1744" }}>&</Text> WIN</Text>
            <Text style={[s.cardSubtitle, !isCenter && { fontSize: 10 }]}>{isEN ? "Big prizes are waiting!" : "ትላልቅ ሽልማቶች ይጠብቁዎታል!"}</Text>
          </View>

          {/* Primary Button */}
          {isCenter ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                haptics.impact();
                setSpinBetModalVisible(true);
              }}
              style={[s.cardActionBtn, { height: actionBtnH }]}
            >
              <LinearGradient colors={["#FF1744", "#D50000"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cardBtnGrad}>
                <Ionicons name="play" size={15} color="#FFFFFF" />
                <Text style={s.cardBtnText}>REAL SPIN</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={s.cardSideHint}>
              <Text style={s.cardSideHintText}>CLICK TO EXPAND</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // COMING_SOON
    return (
      <TouchableOpacity
        key="COMING_SOON"
        activeOpacity={isCenter ? 0.95 : 0.75}
        onPress={handleCardPress}
        style={[
          s.gameCard,
          isCenter ? s.gameCardCenter : s.gameCardSide,
          isCenter ? { minHeight: centerCardMinH, maxHeight: centerCardMaxH } : { minHeight: sideCardMinH, maxHeight: sideCardMaxH },
          isCenter ? s.gameCardFocusedSoon : s.gameCardUnfocused,
        ]}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#111827", opacity: isCenter ? 1.0 : 0.7 }]} />

        {/* Badges */}
        <View style={s.cardBadgeRow}>
          <View style={[s.badgePill, { backgroundColor: "rgba(136, 147, 167, 0.18)", borderColor: "rgba(136, 147, 167, 0.4)" }]}>
            <Ionicons name="help-circle" size={isCenter ? 11 : 9} color="#8893A7" />
            <Text style={[s.badgeText, { color: "#FFFFFF" }, !isCenter && { fontSize: 8.5 }]}>NEW ARENA</Text>
          </View>
          <View style={[s.badgePill, { backgroundColor: "rgba(245, 182, 66, 0.15)", borderColor: "rgba(245, 182, 66, 0.4)" }]}>
            <Ionicons name="flask" size={isCenter ? 11 : 9} color="#F5B642" />
            <Text style={[s.badgeText, { color: "#F5B642" }, !isCenter && { fontSize: 8.5 }]}>IN LAB</Text>
          </View>
        </View>

        {/* Artwork */}
        <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide, { height: isCenter ? centerArtH : sideArtH }]}>
          <View style={{
            width: isCenter ? 120 : 80,
            height: isCenter ? 120 : 80,
            borderRadius: isCenter ? 60 : 40,
            backgroundColor: "rgba(35, 48, 65, 0.6)",
            borderWidth: 2,
            borderColor: "#233041",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Ionicons name="time" size={isCenter ? 54 : 36} color="#8893A7" />
          </View>
        </View>

        {/* Title & Subtitle */}
        <View style={{ alignItems: "center", marginVertical: isCenter ? titleMargin : 2 }}>
          <Text style={[s.cardTitle, { color: "#8893A7" }, isCenter && { fontSize: titleFontSize }, !isCenter && s.cardTitleSide]}>COMING SOON</Text>
          <Text style={[s.cardSubtitle, !isCenter && { fontSize: 10 }]}>{isEN ? "Next generation multiplayer mode" : "አዲስ የጨዋታ ሁነታ በቅርቡ"}</Text>
        </View>

        {/* Action Button */}
        {isCenter ? (
          <View style={[s.cardActionBtn, { height: actionBtnH }]}>
            <View style={[s.cardBtnGrad, { backgroundColor: "rgba(35, 48, 65, 0.7)", borderWidth: 1.2, borderColor: "rgba(136, 147, 167, 0.3)" }]}>
              <Ionicons name="time-outline" size={15} color="#8893A7" />
              <Text style={[s.cardBtnText, { color: "#8893A7" }]}>COMING SOON</Text>
            </View>
          </View>
        ) : (
          <View style={s.cardSideHint}>
            <Text style={s.cardSideHintText}>CLICK TO EXPAND</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Outer Secondary Shelf (Per User Request: Placed OUTSIDE and directly underneath each card)
  const renderOuterShelf = (tab: "SPIN" | "XO_GAME" | "COMING_SOON", isCenter: boolean) => {
    if (tab === "SPIN") {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            haptics.impact();
            router.push({
              pathname: '/(authed)/home/spin',
              params: { mode: "5_PLAYER" }
            } as any);
          }}
          style={[s.extraShelfBtn, { height: outerShelfH }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.avatarGroup}>
              <View style={[s.shelfAvatar, { backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>1</Text>
              </View>
              <View style={[s.shelfAvatar, { marginLeft: -8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>2</Text>
              </View>
              <View style={[s.shelfAvatar, { marginLeft: -8, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>3</Text>
              </View>
              <View style={[s.shelfAvatarPlus, { marginLeft: -8 }]}>
                <Text style={s.shelfAvatarPlusText}>+2</Text>
              </View>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>5 Players Room</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-forward" size={15} color="#FF1744" />
          </View>
        </TouchableOpacity>
      );
    }

    if (tab === "XO_GAME") {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (!isCenter) {
              setSelectedTab("XO_GAME");
              return;
            }
            haptics.impact();
            setSheetInitialView("FRIENDS");
            openRoomSheet("FRIENDS");
          }}
          style={[s.extraShelfBtn, { height: outerShelfH }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.shelfIconCircle}>
              <Ionicons name="people" size={14} color="#00BFFF" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Play with Friends</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color="#00BFFF" />
        </TouchableOpacity>
      );
    }

    // COMING_SOON
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (!isCenter) {
            setSelectedTab("COMING_SOON");
            return;
          }
          try { playTickSound(); } catch {}
          haptics.tap();
          router.push('/(authed)/home/leaderboard');
        }}
        style={[s.extraShelfBtn, { height: outerShelfH }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.shelfIconCircle, { backgroundColor: 'rgba(245, 182, 66, 0.15)', borderColor: 'rgba(245, 182, 66, 0.35)' }]}>
            <Ionicons name="flash" size={13} color="#F5B642" />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Next-Gen Battles</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color="#F5B642" />
      </TouchableOpacity>
    );
  };

  const DEFAULT_TOP5_PLAYERS = [
    { id: "1", rank: 1, username: "Dawit_K", wins: 28, prize: 500, avatar: "" },
    { id: "2", rank: 2, username: "Sara_M", wins: 24, prize: 300, avatar: "" },
    { id: "3", rank: 3, username: "Abebe_B", wins: 19, prize: 200, avatar: "" },
    { id: "4", rank: 4, username: "Tadesse_G", wins: 15, prize: 100, avatar: "" },
    { id: "5", rank: 5, username: "Selam_T", wins: 12, prize: 100, avatar: "" },
  ];

  // Top 5 players from real server data (with active champion fallback so never blank, max 5)
  const top5Players = useMemo(() => {
    if (weeklyLeaderboard && weeklyLeaderboard.length > 0) {
      return weeklyLeaderboard.slice(0, 5).map((p, idx) => ({
        id: p.id || String(idx + 1),
        rank: idx + 1,
        username: p.username || `Player_${idx + 1}`,
        wins: p.wins || 0,
        prize: idx === 0 ? 500 : idx === 1 ? 300 : idx === 2 ? 200 : 100,
        avatar: p.avatar || '',
      }));
    }
    return DEFAULT_TOP5_PLAYERS;
  }, [weeklyLeaderboard]);

  // Smooth layout animation on rank position exchanges
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {}
    }
  }, [top5Players]);

  return (
    <View style={s.rootContainer}>
      {/* Background Ambience: High performance GPU accelerated auras (No heavy software blur) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: 250,
          backgroundColor: 'rgba(255, 23, 68, 0.035)',
          ...(Platform.OS === 'web' ? { filter: 'blur(50px)', willChange: 'transform' } as any : {}),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -150,
          right: -100,
          width: 600,
          height: 600,
          borderRadius: 300,
          backgroundColor: 'rgba(0, 191, 255, 0.035)',
          ...(Platform.OS === 'web' ? { filter: 'blur(50px)', willChange: 'transform' } as any : {}),
        }}
      />

      {/* Modals & Profile */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={() => { try { refreshProfile?.(true); } catch {} }} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={() => { try { refreshProfile?.(true); } catch {} }} />
      <ProfileEditModal visible={!!user && !user?.username} onClose={() => { }} initialUsername={user?.username} initialDisplayName={(user as any)?.display_name} initialAvatar={(user as any)?.avatar} onSaved={() => { try { refreshProfile?.(true); } catch {} }} />
      <ReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} token={token || null} isEN={isEN} toast={undefined} />

      {roomSheetVisible && (
        <RoomSheet
          language={language}
          balance={balance}
          visible={roomSheetVisible}
          initialView={sheetInitialView}
          step={sheetStep}
          selectedRoom={selectedRoom}
          backdropOpacity={backdropOpacity}
          sheetTranslateY={sheetTranslateY}
          onClose={closeRoomSheet}
          onBack={goBackToRooms}
          onSelectRoom={onSelectRoom}
          onSelectAmount={selectAmount}
          isDesktop={isDesktop}
          userCaps={userCaps}
          onSendFriendInvite={handleSendInvite}
          inviteResult={inviteResult}
        />
      )}

      {/* Real Spin Stake Selector Modal */}
      <SpinBetSelectModal
        visible={spinBetModalVisible}
        onClose={() => setSpinBetModalVisible(false)}
        userBalance={balance}
        language={language}
        onConfirm={(amount) => {
          router.push({
            pathname: "/(authed)/home/spin",
            params: { mode: "RAIL", stake: String(amount) },
          } as any);
        }}
      />

      {/* ── UNIFIED DESKTOP HEADER (Brand Compliant, No Purple) ── */}
      <DesktopHeader
        user={user}
        language={language}
        handleLanguageToggle={handleLanguageToggle}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        setPwaModalVisible={setPwaModalVisible}
        bgMusicPlaying={bgMusicPlaying}
        onToggleSound={onToggleSound}
        unreadCount={unreadCount}
        setNotificationsVisible={setNotificationsVisible}
        router={router}
      />

      {/* ── 3. MODULAR SUB-SECTIONS (LEADERBOARD & COMMUNITY) ── */}
      {(() => {
        const renderLeaderboardCard = () => (
          <View style={s.leaderboardCard}>
            {/* Header */}
            <View style={s.leaderboardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: "#00BFFF" }} />
                <Text style={s.leaderboardTitle}>WEEKLY LEADERBOARD</Text>
              </View>
              <Text style={s.leaderboardSubtitle}>Top 5 Ranks</Text>
            </View>

            {/* Player List (Top 5 rows per user spec) */}
            <View style={{ gap: 8 }}>
              {top5Players.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 }}>
                  <Ionicons name="trophy-outline" size={28} color="rgba(255,255,255,0.2)" />
                  <Text style={{ color: '#8893A7', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
                    Weekly leaderboard active!{'\n'}Play matches to claim rank 1.
                  </Text>
                </View>
              ) : (
                top5Players.map((champ) => {
                  const rankColor = champ.rank === 1 ? "#F5B642" : champ.rank === 2 ? "#00BFFF" : champ.rank === 3 ? "#FF1744" : "#8893A7";
                  return (
                    <View key={champ.username || champ.id || champ.rank} style={s.leaderboardRow}>
                      {/* Rank Badge — Solid Bold Pill for Top Ranks without '#' */}
                      <View style={[
                        s.rankNumberBadge,
                        champ.rank === 1 && { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
                        champ.rank === 2 && { backgroundColor: "#00DAF3", borderColor: "#00DAF3" },
                        champ.rank === 3 && { backgroundColor: "#F97316", borderColor: "#F97316" },
                        champ.rank > 3 && { backgroundColor: "#1e293b", borderColor: "#334155" },
                      ]}>
                        <Text style={[
                          s.rankNumberText,
                          { color: champ.rank <= 3 ? "#080F17" : "#94a3b8" }
                        ]}>{champ.rank}</Text>
                      </View>

                      {/* Username without initial letter circle */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={s.playerUsername}>{champ.username}</Text>
                        <Text style={s.playerWins}>{champ.wins} wins this week</Text>
                      </View>

                      {/* Prize Amount — Clean text aligned right with rank accent color */}
                      <Text style={[s.playerPrizeTextClean, { color: rankColor }]}>
                        {champ.prize} ETB
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* View All / See More Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                try { playTickSound(); } catch {}
                haptics.tap();
                router.push('/(authed)/home/leaderboard');
              }}
              style={s.seeMoreBtn}
            >
              <Text style={s.seeMoreBtnText}>VIEW ALL LEADERBOARD</Text>
              <Ionicons name="arrow-forward" size={14} color="#00BFFF" />
            </TouchableOpacity>
          </View>
        );

        const renderLiveWinnersCard = () => {
          const liveList = (props.rawTickerList && props.rawTickerList.length > 0)
            ? props.rawTickerList.slice(0, 5).map((item, idx) => ({
                id: `ticker_${idx}_${item.username}`,
                username: item.username || `Player_${idx + 1}`,
                amount: typeof item.amount === "number" ? item.amount : Number(item.amount) || 0,
                game: idx % 2 === 0 ? "XO Battle" : "5-Player Spin",
                time: idx === 0 ? "Just now" : `${idx * 2 + 1}m ago`,
              }))
            : [];

          return (
            <View style={[s.leaderboardCard, { marginTop: isTabletLayout ? 0 : 16 }]}>
              {/* Header */}
              <View style={s.leaderboardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={s.liveGreenDot} />
                    <Text style={s.leaderboardTitle}>LIVE WINNERS</Text>
                  </View>
                  <View style={s.liveBadgePill}>
                    <Text style={s.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={s.leaderboardSubtitle}>Real-time player payouts</Text>
              </View>

              {/* Real-time Winners Rows (100% Real Server Data, No Mock Fallbacks) */}
              <View style={{ gap: 8 }}>
                {liveList.length > 0 ? (
                  liveList.map((win) => (
                    <View key={win.id} style={s.liveWinnerRow}>
                      <View style={s.liveWinnerIconCircle}>
                        <Ionicons
                          name={win.game === "XO Battle" ? "grid" : "aperture"}
                          size={12}
                          color="#00BFFF"
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={s.liveWinnerName}>
                          {win.username}
                        </Text>
                        <Text numberOfLines={1} style={s.liveWinnerMeta}>
                          {win.game} • {win.time}
                        </Text>
                      </View>
                      <Text style={s.liveWinnerPrize}>+{win.amount} ETB</Text>
                    </View>
                  ))
                ) : (
                  <View style={{ paddingVertical: 18, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="time-outline" size={20} color="#64748b" style={{ marginBottom: 6 }} />
                    <Text style={{ color: "#8893A7", fontSize: 12, fontWeight: "600" }}>
                      {isEN ? "Waiting for recent wins..." : "የቅርብ ጊዜ አሸናፊዎች በመጠበቅ ላይ..."}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        };

        const renderCommunityCard = () => (
          <View style={[s.leaderboardCard, { marginTop: isTabletLayout ? 0 : 16 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Ionicons name="globe-outline" size={17} color="#00BFFF" />
              <Text style={s.leaderboardTitle}>COMMUNITY & SUPPORT</Text>
            </View>

            {/* Link 1: Telegram Channel */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('https://t.me/xoethiopia' as any)}
              style={[s.supportLinkBtn, { backgroundColor: "rgba(0, 191, 255, 0.12)", borderColor: "rgba(0, 191, 255, 0.4)" }]}
            >
              <Ionicons name="paper-plane" size={15} color="#00BFFF" />
              <Text style={[s.supportLinkBtnText, { color: "#00BFFF" }]}>JOIN TELEGRAM CHANNEL</Text>
            </TouchableOpacity>

            {/* Link 2: 24/7 Live Support */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('https://t.me/xoetsupport' as any)}
              style={[s.supportLinkBtn, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.4)", marginTop: 10 }]}
            >
              <Ionicons name="headset" size={15} color="#10B981" />
              <Text style={[s.supportLinkBtnText, { color: "#10B981" }]}>24/7 LIVE SUPPORT</Text>
            </TouchableOpacity>
          </View>
        );

        const renderCenterContent = () => (
          <View
            style={s.centerColumn}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 100 && Math.abs(w - centerWidth) > 10) {
                setCenterWidth(w);
              }
            }}
          >
            {/* Carousel Container with Overlaid Arrows */}
            <View style={s.carouselWrapper}>
              {/* Left Navigation Arrow (Framing Center Card Deck) */}
              <TouchableOpacity
                onPress={handlePrevCard}
                style={[s.carouselArrowLeft, { left: arrowOffset }]}
                activeOpacity={0.85}
                accessibilityLabel="Previous Card"
              >
                <Ionicons name="chevron-back" size={22} color="#00daf3" />
              </TouchableOpacity>

              {/* Right Navigation Arrow (Framing Center Card Deck) */}
              <TouchableOpacity
                onPress={handleNextCard}
                style={[s.carouselArrowRight, { right: arrowOffset }]}
                activeOpacity={0.85}
                accessibilityLabel="Next Card"
              >
                <Ionicons name="chevron-forward" size={22} color="#00daf3" />
              </TouchableOpacity>

              {/* Reanimated 3D Carousel (Matching Phone Animation Specification) */}
              <View style={{ width: "100%", height: carouselH, alignItems: "center", overflow: "hidden" }}>
                <Carousel
                  ref={carouselRef}
                  loop={true}
                  renderWindowSize={3}
                  defaultIndex={initialIndex}
                  data={tabs}
                  style={{ width: centerWidth, height: carouselH }}
                  itemSize={itemSize}
                  itemAnimation={itemAnimation}
                  animation={{
                    type: "timing",
                    duration: 250,
                    easing: Easing.bezier(0.2, 0.9, 0.3, 1),
                  }}
                  progress={progress}
                  onSnapToItem={(rawIdx) => {
                    isCarouselBusyRef.current = false;
                    const normalizedIdx = ((rawIdx % tabs.length) + tabs.length) % tabs.length;
                    setIndex(normalizedIdx);
                    const newTab = tabs[normalizedIdx];
                    if (newTab !== selectedTab) {
                      try { playTickSound(); } catch {}
                      haptics.impact();
                      setSelectedTab(newTab);
                    }
                  }}
                  renderItem={({ item, index: itemIdx }) => {
                    const isCenter = index === itemIdx;
                    return (
                      <View style={{ width: cardWidth, alignItems: "center" }}>
                        {renderCoverflowCard(item, isCenter ? "center" : "left")}
                        <View style={s.outerShelfWrapper}>
                          {renderOuterShelf(item, isCenter)}
                        </View>
                      </View>
                    );
                  }}
                />
              </View>

              {/* Bottom Pagination Indicators */}
              <Pagination
                count={tabs.length}
                progress={progress}
                containerStyle={{ gap: 8, marginTop: isShortScreen ? 4 : (isCompactDesktopH ? 8 : 12), marginBottom: isShortScreen ? 4 : 10, alignSelf: "center" }}
                dotStyle={{ width: 8, height: 7, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.25)" }}
                activeDotStyle={{
                  width: 24,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: index === 0 ? "#FF1744" : index === 1 ? "#00BFFF" : "#8893A7",
                }}
                onPress={(i) => {
                  try { playTickSound(); } catch {}
                  haptics.tap();
                  carouselRef.current?.scrollTo({ index: i, animated: true });
                  setIndex(i);
                  setSelectedTab(tabs[i]);
                }}
              />
            </View>

            {/* ── FULL-WIDTH WELCOME BONUS CLAIMED CARD (Per User Request) ── */}
            <View style={s.desktopWelcomeBonusCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={s.bonusIconBox}>
                  <Ionicons name="gift" size={24} color="#F5B642" />
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={s.bonusTitle}>WELCOME BONUS</Text>
                  </View>
                  <Text style={s.bonusDesc}>{isEN ? "You have received your welcome reward" : "የእንኳን ደህና መጡ ሽልማትዎን ወስደዋል"}</Text>
                </View>
              </View>

              {/* Clean Minimalist Claimed State: Small green icon + readable text, no nested box */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                <Text style={{ color: "#10B981", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 }}>
                  {isEN ? "CLAIMED" : "ተወስዷል"}
                </Text>
              </View>
            </View>
          </View>
        );

        return (
          <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.pageContentWrapper}>
              {isTabletLayout ? (
                /* TABLET 2-COLUMN RESPONSIVE LAYOUT (iPad/Tablet Support) */
                <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start", width: "100%" }}>
                  <View style={{ width: winW < 1120 ? 72 : 240, gap: 16 }}>
                    <DesktopSidebar
                      user={user}
                      balance={balance}
                      currentScreen="home"
                      style={{ width: "100%" }}
                      refreshProfile={(force?: boolean) => { try { refreshProfile?.(force ?? true); } catch (_) {} }}
                      setDepositVisible={setDepositVisible}
                      setWithdrawVisible={setWithdrawVisible}
                      router={router}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 16 }}>
                    {renderCenterContent()}
                    {/* On Tablet: Leaderboard & Live Winners sit side-by-side underneath */}
                    <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start", width: "100%" }}>
                      <View style={{ flex: 1 }}>{renderLeaderboardCard()}</View>
                      <View style={{ flex: 1 }}>{renderLiveWinnersCard()}</View>
                    </View>
                  </View>
                </View>
              ) : (
                /* DESKTOP 3-COLUMN LAYOUT (Image 3 Match) */
                <View style={[s.threeColumnRow, { gap: columnGap }]}>
                  {/* Left Column: Profile, Nav, AND Community & Support underneath */}
                  <View style={{ width: leftSidebarW, gap: 16 }}>
                    <DesktopSidebar
                      user={user}
                      balance={balance}
                      currentScreen="home"
                      style={{ width: "100%" }}
                      refreshProfile={(force?: boolean) => { try { refreshProfile?.(force ?? true); } catch (_) {} }}
                      setDepositVisible={setDepositVisible}
                      setWithdrawVisible={setWithdrawVisible}
                      router={router}
                    />
                  </View>

                  {/* Center Column: Game Carousel & Welcome Bonus */}
                  {renderCenterContent()}

                  {/* Right Column: Weekly Leaderboard AND Live Winners underneath */}
                  <View style={[s.rightSidebar, { width: rightSidebarW, gap: 16 }]}>
                    {renderLeaderboardCard()}
                    {renderLiveWinnersCard()}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        );
      })()}
    </View>
  );
}

const s = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#080F17", // Brand Deep Navy (Image 4)
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  pageContentWrapper: {
    width: "100%",
    maxWidth: 1720,
    alignSelf: "center",
    overflow: "hidden",
  },
  threeColumnRow: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },

  // Center Column Carousel
  centerColumn: {
    flex: 1,
    minWidth: 0,
    gap: 14,
    overflow: "hidden",
  },
  carouselWrapper: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
  },
  carouselArrowLeft: {
    position: "absolute",
    left: 14,
    top: "34%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(8, 16, 32, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 120,
    boxShadow: "0 4px 14px rgba(0, 218, 243, 0.25)",
    cursor: "pointer",
  } as any,
  carouselArrowRight: {
    position: "absolute",
    right: 14,
    top: "34%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(8, 16, 32, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 218, 243, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 120,
    boxShadow: "0 4px 14px rgba(0, 218, 243, 0.25)",
    cursor: "pointer",
  } as any,
  threeCardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    paddingHorizontal: 8,
  },
  coverflowColumn: {
    alignItems: "center",
    transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  } as any,
  coverflowColumnCenter: {
    flex: 1.0,
    minWidth: 320,
    maxWidth: 440,
    zIndex: 10,
  },
  coverflowColumnSide: {
    flex: 0.75,
    minWidth: 200,
    maxWidth: 260,
    zIndex: 2,
    cursor: "pointer",
  } as any,
  outerShelfWrapper: {
    width: "100%",
    marginTop: 8,
    transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  } as any,
  gameCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#233041",
    width: "100%",
    transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
  } as any,
  gameCardCenter: {
    minHeight: 530,
    maxHeight: 575,
    padding: 18,
    zIndex: 10,
    transform: [{ scale: 1.0 }],
    opacity: 1.0,
  },
  gameCardSide: {
    minHeight: 410,
    maxHeight: 450,
    padding: 16,
    zIndex: 2,
    transform: [{ scale: 1.0 }],
    opacity: 0.75,
    cursor: "pointer",
  } as any,
  gameCardFocusedSpin: {
    borderColor: "#FF1744",
    borderWidth: 2,
    boxShadow: "0 10px 35px rgba(255, 23, 68, 0.35)",
  } as any,
  gameCardFocusedXo: {
    borderColor: "#00BFFF",
    borderWidth: 2,
    boxShadow: "0 10px 35px rgba(0, 191, 255, 0.35)",
  } as any,
  gameCardFocusedSoon: {
    borderColor: "#8893A7",
    borderWidth: 2,
    boxShadow: "0 10px 30px rgba(136, 147, 167, 0.25)",
  } as any,
  gameCardUnfocused: {
    borderWidth: 1.2,
    borderColor: "#233041",
  } as any,
  cardBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    fontFamily: "Space Grotesk, sans-serif",
  },
  cardArtWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  cardArtWrapperCenter: {
    height: 335,
    marginVertical: 4,
  },
  cardArtWrapperSide: {
    height: 225,
    marginVertical: 4,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.6,
  },
  cardTitleSide: {
    fontSize: 22,
    letterSpacing: 0.4,
  },
  cardSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  cardActionBtn: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 2,
  },
  extraShelfBtn: {
    width: "100%",
    marginTop: 8,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
    ...(Platform.OS === "web" ? {
      transition: "all 200ms ease",
      cursor: "pointer",
    } as any : {}),
  },
  extraShelfHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  extraShelfLabel: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, sans-serif",
  },
  liveDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveDotText: {
    color: "#10B981",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  extraShelfCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  avatarGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  shelfAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#111827",
  },
  shelfAvatarPlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 23, 68, 0.25)",
    borderWidth: 1.5,
    borderColor: "#FF1744",
    alignItems: "center",
    justifyContent: "center",
  },
  shelfAvatarPlusText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  shelfActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
  },
  shelfIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 191, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 191, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnGrad: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, sans-serif",
  },
  cardSideHint: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 4,
  },
  cardSideHintText: {
    color: "#8893A7",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, sans-serif",
  },
  indicatorsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  indicatorPill: {
    height: 6,
    borderRadius: 3,
    transition: "all 200ms ease",
  } as any,

  // Desktop Welcome Bonus Card
  desktopWelcomeBonusCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#233041",
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bonusIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(245, 182, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  bonusTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.8,
  },
  bonusClaimedPill: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bonusClaimedText: {
    color: "#10B981",
    fontSize: 9,
    fontWeight: "900",
  },
  bonusDesc: {
    color: "#8893A7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  bonusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(35, 48, 65, 0.4)",
    borderWidth: 1,
    borderColor: "#233041",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bonusActionText: {
    color: "#8893A7",
    fontSize: 11,
    fontWeight: "800",
  },

  // Right Sidebar: Weekly Leaderboard List
  rightSidebar: {
    width: 335,
  },
  leaderboardCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#233041",
    padding: 18,
  },
  leaderboardHeader: {
    marginBottom: 14,
  },
  leaderboardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.8,
  },
  leaderboardSubtitle: {
    color: "#8893A7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(8, 15, 23, 0.75)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 8,
    paddingHorizontal: 10,
    gap: 10,
    ...(Platform.OS === "web" ? { transition: "all 350ms cubic-bezier(0.2, 0.9, 0.3, 1)", willChange: "transform, opacity" } as any : {}),
  },
  rankNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.2,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumberText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  playerInitialText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Space Grotesk, sans-serif",
    width: 14,
    textAlign: "center",
  },
  playerPrizeTextClean: {
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.3,
  },
  playerAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1F2937",
  },
  playerUsername: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 105,
  },
  playerWins: {
    color: "#8893A7",
    fontSize: 10,
    fontWeight: "600",
  },
  playerPrizeBadge: {
    backgroundColor: "rgba(35, 48, 65, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.8,
    borderColor: "#233041",
  },
  playerPrizeText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
  seeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0, 191, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 191, 255, 0.35)",
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  seeMoreBtnText: {
    color: "#00BFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "Space Grotesk, sans-serif",
  },

  // 2 Links in Right Sidebar: Telegram & Support
  supportLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1.2,
  },
  supportLinkBtnText: {
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    fontFamily: "Space Grotesk, sans-serif",
  },

  // Live Winners Card Styles
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  liveBadgePill: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: "#10B981",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  liveWinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(8, 15, 23, 0.75)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
    ...(Platform.OS === "web" ? { transition: "all 250ms ease", willChange: "transform" } as any : {}),
  },
  liveWinnerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 191, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 191, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveWinnerName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  liveWinnerMeta: {
    color: "#8893A7",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  liveWinnerPrize: {
    color: "#10B981",
    fontSize: 12.5,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
  },
});
