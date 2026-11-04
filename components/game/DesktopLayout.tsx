// components/game/DesktopLayout.tsx
// Full desktop/tablet layout for the XOET gaming platform.
// Redesigned strictly per Image 1 & 2 carousel wireframe and Image 4 Brand Identity.
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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

const spinBgRedImg = require("../../assets/images/spin-background-red-desktop.png");
const xoBgBlueImg = require("../../assets/images/xo-background-blue.png");
const spinCardBordImg = require("../../assets/images/spin-card bord.png");
const xoCardBordImg = require("../../assets/images/xo-card bord.png");

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
    selectedTab = "SPIN", setSelectedTab,
    bgMusicPlaying = true,
    onToggleSound = () => {},
    unreadCount = 0,
    setNotificationsVisible = () => {},
  } = props;

  // Carousel order
  const { width: winW } = useWindowDimensions();
  const isTabletLayout = winW < 1200;
  const tabs: DesktopTabType[] = ["XO_GAME", "SPIN", "COMING_SOON"];
  const [spinBetModalVisible, setSpinBetModalVisible] = useState(false);
  const [sheetInitialView, setSheetInitialView] = useState<"STAKES" | "FRIENDS">("STAKES");
    const slideAnim = useRef(new Animated.Value(0)).current;

  const triggerSlide = (direction: "left" | "right") => {
    slideAnim.setValue(direction === "left" ? 40 : -40);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 8.5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const handlePrevCard = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    triggerSlide("right");
    const currIdx = tabs.indexOf(selectedTab);
    const prevIdx = (currIdx - 1 + tabs.length) % tabs.length;
    setSelectedTab(tabs[prevIdx]);
  };

  const handleNextCard = () => {
    try { playTickSound(); } catch {}
    haptics.tap();
    triggerSlide("left");
    const currIdx = tabs.indexOf(selectedTab);
    const nextIdx = (currIdx + 1) % tabs.length;
    setSelectedTab(tabs[nextIdx]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12,
      onPanResponderMove: (_, gestureState) => {
        slideAnim.setValue(gestureState.dx * 0.55);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = gestureState.dx;
        const vx = gestureState.vx;
        if (dx < -55 || vx < -0.35) {
          handleNextCard();
        } else if (dx > 55 || vx > 0.35) {
          handlePrevCard();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 70,
            friction: 8.5,
            useNativeDriver: Platform.OS !== "web",
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 8.5,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      },
    })
  ).current;

  // 3-Card 3D Coverflow Cycling: Left (small) - Center (BIG Active) - Right (small)
  const visibleCards = useMemo(() => {
    const centerIdx = tabs.indexOf(selectedTab);
    const safeCenterIdx = centerIdx >= 0 ? centerIdx : 1;
    const prevIdx = (safeCenterIdx - 1 + tabs.length) % tabs.length;
    const nextIdx = (safeCenterIdx + 1) % tabs.length;

    return [
      { tab: tabs[prevIdx], position: "left" as const },
      { tab: tabs[safeCenterIdx], position: "center" as const },
      { tab: tabs[nextIdx], position: "right" as const },
    ];
  }, [selectedTab]);

  // Render single card according to its Coverflow position
  const renderCoverflowCard = (tab: DesktopTabType, position: "left" | "center" | "right") => {
    const isCenter = position === "center";
    const isLeft = position === "left";
    const isRight = position === "right";

    const handleCardPress = () => {
      try { playTickSound(); } catch {}
      haptics.tap();
      if (isLeft) {
        handlePrevCard();
      } else if (isRight) {
        handleNextCard();
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
          <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide]}>
            <Image source={xoCardBordImg} style={{ width: "95%", height: "95%" }} resizeMode="contain" />
          </View>

          {/* Title & Subtitle */}
          <View style={{ alignItems: "center", marginVertical: isCenter ? 6 : 2 }}>
            <Text style={[s.cardTitle, !isCenter && s.cardTitleSide]}>XO BATTLE</Text>
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
              style={s.cardActionBtn}
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
          <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide]}>
            <Image source={spinCardBordImg} style={{ width: "95%", height: "95%" }} resizeMode="contain" />
          </View>

          {/* Title & Subtitle */}
          <View style={{ alignItems: "center", marginVertical: isCenter ? 6 : 2 }}>
            <Text style={[s.cardTitle, !isCenter && s.cardTitleSide]}>SPIN <Text style={{ color: "#FF1744" }}>&</Text> WIN</Text>
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
              style={s.cardActionBtn}
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
        <View style={[s.cardArtWrapper, isCenter ? s.cardArtWrapperCenter : s.cardArtWrapperSide]}>
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
        <View style={{ alignItems: "center", marginVertical: isCenter ? 6 : 2 }}>
          <Text style={[s.cardTitle, { color: "#8893A7" }, !isCenter && s.cardTitleSide]}>COMING SOON</Text>
          <Text style={[s.cardSubtitle, !isCenter && { fontSize: 10 }]}>{isEN ? "Next generation multiplayer mode" : "አዲስ የጨዋታ ሁነታ በቅርቡ"}</Text>
        </View>

        {/* Action Button */}
        {isCenter ? (
          <View style={s.cardActionBtn}>
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
            if (!isCenter) {
              setSelectedTab("SPIN");
              return;
            }
            haptics.impact();
            router.push('/(authed)/home/spin');
          }}
          style={s.extraShelfBtn}
        >
          <View style={s.extraShelfHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={13} color="#FF1744" />
              <Text style={s.extraShelfLabel}>5 PLAYERS</Text>
            </View>
            <View style={s.liveDotRow}>
              <View style={[s.liveDot, { backgroundColor: '#10B981' }]} />
              <Text style={s.liveDotText}>REAL TIME</Text>
            </View>
          </View>
          <View style={s.extraShelfCard}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={s.shelfActionText}>5 Players Room</Text>
              <Ionicons name="chevron-forward" size={14} color="#FF1744" />
            </View>
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
          style={s.extraShelfBtn}
        >
          <View style={s.extraShelfHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={13} color="#00BFFF" />
              <Text style={s.extraShelfLabel}>FRIEND PLAY</Text>
            </View>
            <View style={s.liveDotRow}>
              <View style={[s.liveDot, { backgroundColor: '#00BFFF' }]} />
              <Text style={[s.liveDotText, { color: '#00BFFF' }]}>1V1 DUEL</Text>
            </View>
          </View>
          <View style={s.extraShelfCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={s.shelfIconCircle}>
                <Ionicons name="person-add" size={13} color="#00BFFF" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Play with Friends</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.shelfActionText, { color: '#00BFFF' }]}>Invite</Text>
              <Ionicons name="chevron-forward" size={14} color="#00BFFF" />
            </View>
          </View>
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
        style={s.extraShelfBtn}
      >
        <View style={s.extraShelfHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy" size={13} color="#F5B642" />
            <Text style={s.extraShelfLabel}>TOURNAMENTS</Text>
          </View>
          <View style={s.liveDotRow}>
            <View style={[s.liveDot, { backgroundColor: '#F5B642' }]} />
            <Text style={[s.liveDotText, { color: '#F5B642' }]}>IN LAB</Text>
          </View>
        </View>
        <View style={s.extraShelfCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.shelfIconCircle, { backgroundColor: 'rgba(245, 182, 66, 0.15)', borderColor: 'rgba(245, 182, 66, 0.35)' }]}>
              <Ionicons name="flash" size={13} color="#F5B642" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Next-Gen Battles</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.shelfActionText, { color: '#F5B642' }]}>View Rules</Text>
            <Ionicons name="chevron-forward" size={14} color="#F5B642" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Top 8 players from real server data
  const top8Players = useMemo(() => {
    if (weeklyLeaderboard && weeklyLeaderboard.length > 0) {
      return weeklyLeaderboard.slice(0, 8).map((p, idx) => ({
        id: p.id || String(idx + 1),
        rank: idx + 1,
        username: p.username || `Player_${idx + 1}`,
        wins: p.wins || 0,
        prize: idx === 0 ? 500 : idx === 1 ? 300 : idx === 2 ? 200 : 100,
        avatar: p.avatar || '',
      }));
    }
    return [];
  }, [weeklyLeaderboard]);

  return (
    <View style={s.rootContainer}>
      {/* Background Ambience: Subtle Signal Red & Electric Blue auras (No purple) */}
      <View style={{
        position: 'absolute',
        top: -100,
        left: -100,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: 'rgba(255, 23, 68, 0.04)',
        ...(Platform.OS === 'web' ? { filter: 'blur(140px)' } as any : {}),
      }} />
      <View style={{
        position: 'absolute',
        bottom: -150,
        right: -100,
        width: 600,
        height: 600,
        borderRadius: 300,
        backgroundColor: 'rgba(0, 191, 255, 0.04)',
        ...(Platform.OS === 'web' ? { filter: 'blur(160px)' } as any : {}),
      }} />

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

      {/* ── MAIN THREE-COLUMN WORKSPACE ── */}
      <ScrollView style={s.mainScrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageContentWrapper}>
          <View style={s.threeColumnRow}>
            
            {/* ── 1. UNIFIED LEFT SIDEBAR (Brand Compliant, Consistent Across ALL Pages) ── */}
            <DesktopSidebar
              user={user}
              balance={balance}
              currentScreen="home"
              style={{ width: isTabletLayout ? 240 : 270 }}
              refreshProfile={(force?: boolean) => { try { refreshProfile?.(force ?? true); } catch (_) {} }}
              setDepositVisible={setDepositVisible}
              setWithdrawVisible={setWithdrawVisible}
              router={router}
            />

            {/* ── 2. CENTER COLUMN: COVERFLOW 3-CARD CAROUSEL + WELCOME BONUS ── */}
            <View style={s.centerColumn}>
              {/* Carousel Container with Overlaid Arrows */}
              <View style={s.carouselWrapper}>
                
                {/* Left Navigation Arrow */}
                <TouchableOpacity
                  onPress={handlePrevCard}
                  style={s.carouselArrowLeft}
                  activeOpacity={0.85}
                  accessibilityLabel="Previous Card"
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Right Navigation Arrow */}
                <TouchableOpacity
                  onPress={handleNextCard}
                  style={s.carouselArrowRight}
                  activeOpacity={0.85}
                  accessibilityLabel="Next Card"
                >
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {/* 3 Game Columns: Left (scale 0.8) - Center (BIG active scale 1.0) - Right (scale 0.8) with horizontal spring slide */}
                <Animated.View style={[s.threeCardsRow, { transform: [{ translateX: slideAnim }] }]}>
                  {visibleCards.map(({ tab, position }) => {
                    const isCenter = position === "center";
                    return (
                      <View
                        key={tab}
                        style={[
                          s.coverflowColumn,
                          isCenter ? s.coverflowColumnCenter : s.coverflowColumnSide,
                        ]}
                      >
                        {/* 1. Main Game Card (1 primary button inside) */}
                        {renderCoverflowCard(tab, position)}

                        {/* 2. Outside Feature Shelf directly underneath */}
                        <View style={[s.outerShelfWrapper, !isCenter && { opacity: 0.55 }]}>
                          {renderOuterShelf(tab, isCenter)}
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>

                {/* Bottom Indicators */}
                <View style={s.indicatorsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedTab("XO_GAME")}
                    style={[
                      s.indicatorPill,
                      {
                        backgroundColor: selectedTab === "XO_GAME" ? "#00BFFF" : "#233041",
                        width: selectedTab === "XO_GAME" ? 28 : 10,
                      }
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedTab("SPIN")}
                    style={[
                      s.indicatorPill,
                      {
                        backgroundColor: selectedTab === "SPIN" ? "#FF1744" : "#233041",
                        width: selectedTab === "SPIN" ? 28 : 10,
                      }
                    ]}
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedTab("COMING_SOON")}
                    style={[
                      s.indicatorPill,
                      {
                        backgroundColor: selectedTab === "COMING_SOON" ? "#8893A7" : "#233041",
                        width: selectedTab === "COMING_SOON" ? 28 : 10,
                      }
                    ]}
                  />
                </View>
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
                      <View style={s.bonusClaimedPill}>
                        <Text style={s.bonusClaimedText}>CLAIMED</Text>
                      </View>
                    </View>
                    <Text style={s.bonusDesc}>{isEN ? "You have received your welcome reward" : "የእንኳን ደህና መጡ ሽልማትዎን ወስደዋል"}</Text>
                  </View>
                </View>

                <View style={s.bonusActionBtn}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={s.bonusActionText}>CLAIMED</Text>
                </View>
              </View>
            </View>

            {/* ── 3. RIGHT SIDEBAR: LEADERBOARD + 2 LINKS (TELEGRAM & SUPPORT) ── */}
            <View style={s.rightSidebar}>
              <View style={s.leaderboardCard}>
                {/* Header */}
                <View style={s.leaderboardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: "#00BFFF" }} />
                    <Text style={s.leaderboardTitle}>WEEKLY LEADERBOARD</Text>
                  </View>
                  <Text style={s.leaderboardSubtitle}>Top 8 Ranks</Text>
                </View>

                {/* Player List (8 rows) */}
                <View style={{ gap: 8 }}>
                  {top8Players.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 }}>
                      <Ionicons name="trophy-outline" size={28} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: '#8893A7', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
                        Weekly leaderboard active!{'\n'}Play matches to claim rank #1.
                      </Text>
                    </View>
                  ) : (
                    top8Players.map((champ) => {
                    const rankColor = champ.rank === 1 ? "#F5B642" : champ.rank === 2 ? "#00BFFF" : champ.rank === 3 ? "#FF1744" : "#8893A7";
                    return (
                      <View key={champ.rank} style={s.leaderboardRow}>
                        {/* Rank Badge */}
                        <View style={[s.rankNumberBadge, { borderColor: rankColor === '#8893A7' ? '#233041' : rankColor }]}>
                          <Text style={[s.rankNumberText, { color: rankColor }]}>#{champ.rank}</Text>
                        </View>

                        {/* Avatar & Username */}
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {champ.avatar ? (
                            <Image source={{ uri: champ.avatar }} style={s.playerAvatarImg} resizeMode="cover" />
                          ) : (
                            <View style={[s.playerAvatarImg, { backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" }]}>
                              <Text style={{ color: "#8893A7", fontSize: 10, fontWeight: "800" }}>{champ.username.slice(0, 1)}</Text>
                            </View>
                          )}
                          <View>
                            <Text numberOfLines={1} style={s.playerUsername}>{champ.username}</Text>
                            <Text style={s.playerWins}>{champ.wins} wins this week</Text>
                          </View>
                        </View>

                        {/* Prize Amount */}
                        <View style={s.playerPrizeBadge}>
                          <Text style={[s.playerPrizeText, { color: rankColor }]}>
                            {champ.prize} ETB
                          </Text>
                        </View>
                      </View>
                    );
                  }))}
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

              {/* 2 LINKS: TELEGRAM COMMUNITY & 24/7 SUPPORT (Per User Request) */}
              <View style={[s.leaderboardCard, { marginTop: 16 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Ionicons name="globe-outline" size={17} color="#00BFFF" />
                  <Text style={s.leaderboardTitle}>COMMUNITY & SUPPORT</Text>
                </View>

                <Text style={{ color: "#8893A7", fontSize: 11.5, lineHeight: 16, marginBottom: 14 }}>
                  Connect with fellow players or reach out for instant deposit & withdrawal assistance.
                </Text>

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
                  style={[s.supportLinkBtn, { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.4)", marginTop: 8 }]}
                >
                  <Ionicons name="headset" size={15} color="#10B981" />
                  <Text style={[s.supportLinkBtnText, { color: "#10B981" }]}>24/7 LIVE SUPPORT</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
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
    maxWidth: 1480,
    alignSelf: "center",
  },
  threeColumnRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },

  // Center Column Carousel
  centerColumn: {
    flex: 1,
    gap: 14,
  },
  carouselWrapper: {
    position: "relative",
    width: "100%",
  },
  carouselArrowLeft: {
    position: "absolute",
    left: 8,
    top: "34%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 191, 255, 0.95)",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 35,
    boxShadow: "0 6px 20px rgba(0, 191, 255, 0.6)",
    cursor: "pointer",
  } as any,
  carouselArrowRight: {
    position: "absolute",
    right: 8,
    top: "34%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 191, 255, 0.95)",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 35,
    boxShadow: "0 6px 20px rgba(0, 191, 255, 0.6)",
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
    zIndex: 10,
  },
  coverflowColumnSide: {
    flex: 0.75,
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
    minHeight: 460,
    maxHeight: 510,
    padding: 20,
    zIndex: 10,
    transform: [{ scale: 1.0 }],
    opacity: 1.0,
  },
  gameCardSide: {
    minHeight: 345,
    maxHeight: 382,
    padding: 14,
    zIndex: 2,
    transform: [{ scale: 1.0 }],
    opacity: 0.65,
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
    height: 220,
    marginVertical: 6,
  },
  cardArtWrapperSide: {
    height: 165,
    marginVertical: 4,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "Space Grotesk, sans-serif",
    letterSpacing: 0.5,
  },
  cardTitleSide: {
    fontSize: 21,
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
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 2,
  },
  extraShelfBtn: {
    width: "100%",
    marginTop: 12,
    backgroundColor: "rgba(8, 15, 23, 0.8)",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#233041",
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 2,
    transition: "all 200ms ease",
    cursor: "pointer",
  } as any,
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
    width: 285,
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
    backgroundColor: "#080F17",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#233041",
    padding: 8,
    paddingHorizontal: 10,
    gap: 10,
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
});
