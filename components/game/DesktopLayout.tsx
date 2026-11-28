// components/game/DesktopLayout.tsx
// Full desktop & tablet layout for XOET gaming platform.
// Strictly matches the provided design screenshot:
// - Left: DesktopSidebar with Welcome Bonus, Navigation (Solid Blue active pill), and Real Top 3 Leaders (Real Wins, NO PTS)
// - Top: DesktopHeader with Brand "XO✦✦" Logo, Functional Search with dropdown, ETB Wallet + Actions Menu (Deposit & Withdraw)
// - Section A: Featured Game Carousel (STRICTLY 3 CARDS: Spin & Win, XO Battle [dominant], RPS Battle)
// - Section B: "Games" Section below with 3 full-bleed artwork cards (Artwork covers entire card, title & buttons over artwork at bottom)
// - Fully connects all game launches, multiplayer/friends flows, and real database data
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Carousel,
  type CarouselItemAnimation,
  type CarouselRef,
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
import FriendMatchModal from "./FriendMatchModal";
import DesktopHeader, { DesktopTabType } from "./DesktopHeader";
import DesktopSidebar, { LeaderboardItem } from "./DesktopSidebar";
import SpinBetSelectModal from "./SpinBetSelectModal";
import RpsBetSelectModal from "./RpsBetSelectModal";
import PromotionalBannersRow from "../home/PromotionalBannersRow";
import LatestWinningsCard from "./LatestWinningsCard";
import { useSidebarCollapse } from "../../hooks/useSidebarCollapse";
import type { RoomConfig, SheetStep } from "./gameplayConstants";
import { haptics } from "../../lib/haptcs";
import { playTickSound } from "../../lib/pinTickAudio";
import { clamp } from "../../constants/breakpoints";

// ──────────────── Integrated Design Assets ────────────────
const xoBg = require("../../assets/images/xo-background-blue.webp");
const xoFg = require("../../assets/dashboard/xo-foreground.webp");
const spinBg = require("../../assets/images/spin-background-red-desktop.webp");
const spinFg = require("../../assets/images/spin-card bord.webp");
const rpsBg = require("../../assets/dashboard/rps-background.webp");
const rpsFg = require("../../assets/dashboard/rps-foreground.webp");

type LeaderboardEntry = {
  id?: string;
  username?: string;
  avatar?: string;
  wins?: number;
  isMe?: boolean;
};

interface CarouselCardItem {
  id: DesktopTabType;
  title: string;
  subtitle: string;
}

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
  rawTickerList: { username: string; amount: number | string; game?: string }[];
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
  handleSendInvite: (username: string, betAmount: number, gameType?: "xo" | "rps") => void;
  onStartRpsMatchmaking?: (stakeAmount: number) => void;
  onOpenRpsFriendMatch?: () => void;
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
    user,
    token,
    balance,
    language,
    isDesktop,
    isTablet,
    isEN,
    weeklyLeaderboard = [],
    roomSheetVisible,
    sheetStep,
    selectedRoom,
    backdropOpacity,
    sheetTranslateY,
    userCaps,
    depositVisible,
    withdrawVisible,
    pwaModalVisible,
    showReferralModal,
    setDepositVisible,
    setWithdrawVisible,
    friendModalVisible,
    setFriendModalVisible,
    setPwaModalVisible,
    setShowReferralModal,
    openRoomSheet,
    closeRoomSheet,
    goBackToRooms,
    onSelectRoom,
    selectAmount,
    handleSendInvite,
    inviteResult,
    refreshProfile,
    handleLanguageToggle,
    router,
    selectedTab = "XO_GAME",
    setSelectedTab,
    bgMusicPlaying = true,
    onToggleSound = () => {},
    unreadCount = 0,
    setNotificationsVisible = () => {},
  } = props;

  const { width: winW } = useWindowDimensions();
  const { isCollapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapse } = useSidebarCollapse();
  const isRail = (winW >= 768 && winW < 1024) || sidebarCollapsed;
  const sidebarWidth = isRail ? 72 : 260;

  const [searchQuery, setSearchQuery] = useState("");
  const [gamesSearch, setGamesSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "luck" | "1v1">("all");
  const [spinBetModalVisible, setSpinBetModalVisible] = useState(false);
  const [rpsBetModalVisible, setRpsBetModalVisible] = useState(false);
  const [friendGameType, setFriendGameType] = useState<"xo" | "rps">("xo");
  const [highlightedGame, setHighlightedGame] = useState<DesktopTabType | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const contentContainerYRef = useRef(0);
  const gamesSectionYRef = useRef(0);
  const highlightTimerRef = useRef<any>(null);

  const scrollToGameSection = useCallback((gameId: DesktopTabType) => {
    setFilterCategory("all");
    setGamesSearch("");
    setSelectedTab(gameId);
    setHighlightedGame(gameId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedGame(null), 1800);
    const targetY = Math.max(0, contentContainerYRef.current + gamesSectionYRef.current - 16);
    mainScrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, [setSelectedTab]);

  // SECTION A: STRICTLY 3 CARDS ONLY
  const carouselSlides: CarouselCardItem[] = useMemo(
    () => [
      { id: "SPIN", title: "SPIN & WIN", subtitle: "Big prizes are waiting!" },
      { id: "XO_GAME", title: "XO BATTLE", subtitle: "Think, Move, Win." }, // Center dominant (index 1)
      { id: "RPS", title: "RPS BATTLE", subtitle: "Rock • Paper • Scissors" },
    ],
    []
  );

  const initialIndex = 1; // XO_GAME in the center
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const carouselRef = useRef<CarouselRef>(null);
  const progress = useSharedValue<number>(initialIndex);

  // Synchronize carousel when external tab changes
  useEffect(() => {
    const targetIdx = carouselSlides.findIndex((s) => s.id === selectedTab);
    if (targetIdx >= 0 && targetIdx !== currentIndex) {
      carouselRef.current?.scrollTo({ index: targetIdx, animated: true });
      setCurrentIndex(targetIdx);
    }
  }, [selectedTab, carouselSlides]);

  // Dimensions for Carousel
  const mainContentWidth = Math.max(winW - sidebarWidth - 48, 640);
  const cardWidth = Math.round(clamp(360, mainContentWidth * 0.46, 480));
  const cardHeight = Math.round(cardWidth * 0.64);
  const carouselHeight = cardHeight + 20;
  const sideOffset = Math.round(cardWidth * 0.65);

  // 3D Coverflow Worklet animation
  const itemAnimation = useCallback<CarouselItemAnimation>(
    (value) => {
      "worklet";
      const d = Math.abs(value);
      return {
        transform: [
          { translateX: value * sideOffset + (mainContentWidth - cardWidth) / 2 },
          { translateY: interpolate(d, [0, 1], [0, 12], Extrapolation.CLAMP) },
          { scale: interpolate(d, [0, 1], [1, 0.88], Extrapolation.CLAMP) },
          { perspective: 1000 },
          { rotateY: `${interpolate(value, [-1, 0, 1], [28, 0, -28], Extrapolation.CLAMP)}deg` },
        ],
        zIndex: Math.round(100 - d * 25),
        opacity: interpolate(d, [0, 1], [1, 0.75], Extrapolation.CLAMP),
      };
    },
    [mainContentWidth, cardWidth, sideOffset]
  );

  // Real Top 3 Leaders with actual win counts from backend (NO FAKE DATA)
  const topLeadersFormatted: LeaderboardItem[] = useMemo(() => {
    if (weeklyLeaderboard && Array.isArray(weeklyLeaderboard) && weeklyLeaderboard.length > 0) {
      return weeklyLeaderboard
        .filter((p) => p && p.username)
        .slice(0, 3)
        .map((item, idx) => ({
          rank: idx + 1,
          username: item.username || `Player_${idx + 1}`,
          wins: Number(item.wins || 0),
          avatar: item.avatar || "",
        }));
    }
    return [];
  }, [weeklyLeaderboard]);

  // Handler for opening Friend Match modal for either XO or RPS
  const handleOpenFriendMatch = (game: "xo" | "rps") => {
    try {
      playTickSound();
    } catch {}
    haptics.tap();
    setFriendGameType(game);
    setFriendModalVisible(true);
  };

  // ──────────────── Render A Carousel Card (Section A) ────────────────
  const renderSlideItem = (slide: CarouselCardItem, isCenter: boolean) => {
    const handleCardPress = () => {
      try {
        playTickSound();
      } catch {}
      haptics.tap();

      const idx = carouselSlides.findIndex((s) => s.id === slide.id);
      if (!isCenter && idx >= 0) {
        carouselRef.current?.scrollTo({ index: idx, animated: true });
        setCurrentIndex(idx);
      }
      scrollToGameSection(slide.id);
    };

    if (slide.id === "XO_GAME") {
      const artSize = Math.round(cardHeight * 0.68);
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleCardPress}
          style={[
            s.featuredCard,
            { width: cardWidth, height: cardHeight },
            isCenter && s.featuredCardCenter,
          ]}
        >
          {/* Card Atmospheric Background Plate */}
          <Image source={xoBg} style={s.cardBackgroundImg} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

          {/* Top Badges */}
          <View style={s.cardBadgeRow}>
            <View style={s.badgePill}>
              <Text style={s.badgePillIcon}>✕</Text>
              <Text style={s.badgePillText}>XO</Text>
            </View>
            <View style={s.badgePill}>
              <Text style={s.badgePillIcon}>★</Text>
              <Text style={s.badgePillText}>CLASSIC</Text>
            </View>
          </View>

          {/* Center Art Illustration — Prominent 2x Size */}
          <View style={s.featuredArtWrap}>
            <Image
              source={xoFg}
              style={{ width: artSize, height: artSize }}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Title & Subtitle — Clearly positioned below the art */}
          <View style={s.featuredTextWrap}>
            <Text style={s.cardTitle}>XO BATTLE</Text>
            <Text style={s.cardSubtitle}>Think, Move, Win.</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (slide.id === "SPIN") {
      const artSize = Math.round(cardHeight * 0.68);
      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleCardPress}
          style={[
            s.featuredCard,
            { width: cardWidth, height: cardHeight },
            isCenter && s.featuredCardCenter,
          ]}
        >
          <Image source={spinBg} style={s.cardBackgroundImg} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

          <View style={s.cardBadgeRowEmpty} />

          <View style={s.featuredArtWrap}>
            <Image
              source={spinFg}
              style={{ width: artSize, height: artSize }}
              resizeMode="contain"
            />
          </View>

          <View style={s.featuredTextWrap}>
            <Text style={s.cardTitle}>
              SPIN <Text style={{ color: "#FF3B57" }}>&</Text> WIN
            </Text>
            <Text style={s.cardSubtitle}>{slide.subtitle}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // RPS
    const rpsArtSize = Math.round(cardHeight * 0.68);
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleCardPress}
        style={[
          s.featuredCard,
          { width: cardWidth, height: cardHeight },
          isCenter && s.featuredCardCenter,
        ]}
      >
        <Image source={rpsBg} style={s.cardBackgroundImg} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

        <View style={s.cardBadgeRowEmpty} />

        <View style={s.featuredArtWrap}>
          <Image
            source={rpsFg}
            style={{ width: rpsArtSize, height: rpsArtSize }}
            resizeMode="contain"
          />
        </View>

        <View style={s.featuredTextWrap}>
          <Text style={s.cardTitle}>RPS BATTLE</Text>
          <Text style={s.cardSubtitle}>{slide.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      {/* ──────────────── MODALS ──────────────── */}
      <WebDepositModal
        visible={depositVisible}
        onClose={() => setDepositVisible(false)}
        user={user}
        token={token || undefined}
        onSuccess={() => {
          try {
            refreshProfile?.(true);
          } catch {}
        }}
      />
      <WebWithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        user={user}
        token={token || undefined}
        onSuccess={() => {
          try {
            refreshProfile?.(true);
          } catch {}
        }}
      />
      <ProfileEditModal
        visible={!!user && !user?.username}
        onClose={() => {}}
        initialUsername={user?.username}
        initialDisplayName={(user as any)?.display_name}
        initialAvatar={(user as any)?.avatar}
        onSaved={() => {
          try {
            refreshProfile?.(true);
          } catch {}
        }}
      />
      <ReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        token={token || null}
        isEN={isEN}
        toast={undefined as any}
      />

      {/* Real Multiplayer / Friend Challenge Modal */}
      <FriendMatchModal
        visible={friendModalVisible}
        onClose={() => {
          setFriendModalVisible(false);
          props.setInviteResult?.(null);
          setFriendGameType("xo");
        }}
        onSendInvite={(uname, amt) => handleSendInvite(uname, amt, friendGameType)}
        inviteResult={inviteResult}
        gameType={friendGameType}
      />

      {/* XO Battle Room / Stake Sheet */}
      {roomSheetVisible && (
        <RoomSheet
          language={language}
          balance={balance}
          visible={roomSheetVisible}
          initialView="STAKES"
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

      {/* Spin Bet Modal */}
      <SpinBetSelectModal
        visible={spinBetModalVisible}
        onClose={() => setSpinBetModalVisible(false)}
        userBalance={balance}
        language={language}
        onConfirm={(amount) => {
          router.push({
            pathname: "/(authed)/home/spin",
            params: { mode: "RAIL", stake: String(amount), joinNonce: String(Date.now()) },
          } as any);
        }}
      />

      {/* RPS Bet Modal */}
      <RpsBetSelectModal
        visible={rpsBetModalVisible}
        onClose={() => setRpsBetModalVisible(false)}
        userBalance={balance}
        language={language}
        onConfirm={(amount) => {
          setRpsBetModalVisible(false);
          if (props.onStartRpsMatchmaking) {
            props.onStartRpsMatchmaking(amount);
          } else {
            router.push({
              pathname: "/(authed)/games/rps",
              params: { stake: String(amount) },
            } as any);
          }
        }}
        onOpenFriendMatch={() => {
          handleOpenFriendMatch("rps");
        }}
      />

      {/* ──────────────── BODY: FULL-HEIGHT LEFT SIDEBAR + RIGHT MAIN COLUMN ──────────────── */}
      <View style={s.layoutRoot}>
        {/* Left Sidebar (Full Height from top of window to bottom) */}
        <View style={s.sidebarContainer}>
          <DesktopSidebar
            user={user}
            balance={balance}
            currentScreen="home"
            topLeaders={topLeadersFormatted}
            refreshProfile={refreshProfile}
            setDepositVisible={setDepositVisible}
            setWithdrawVisible={setWithdrawVisible}
            router={router}
            style={{ height: "100%" }}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
          />
        </View>

        {/* Right Main Column */}
        <View style={s.rightColumn}>
          {/* Top Header inside Right Column */}
          <DesktopHeader
            user={user}
            balance={balance}
            setDepositVisible={setDepositVisible}
            setWithdrawVisible={setWithdrawVisible}
            language={language}
            handleLanguageToggle={handleLanguageToggle}
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            setPwaModalVisible={setPwaModalVisible}
            bgMusicPlaying={bgMusicPlaying}
            onToggleSound={onToggleSound}
            unreadCount={unreadCount}
            setNotificationsVisible={setNotificationsVisible}
            router={router}
          />

          {/* Main Content Area */}
          <ScrollView
            ref={mainScrollRef}
            style={s.mainScrollView}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* ──────────────── SECTION A: FEATURED GAME CAROUSEL (3 CARDS ONLY) ──────────────── */}
          <View style={[s.carouselWrapper, { height: carouselHeight }]}>
            <Carousel
              ref={carouselRef}
              loop={true}
              renderWindowSize={3}
              defaultIndex={initialIndex}
              data={carouselSlides}
              style={{ width: mainContentWidth, height: carouselHeight }}
              itemSize={cardWidth}
              itemAnimation={itemAnimation}
              animation={{
                type: "timing",
                duration: 250,
                easing: Easing.bezier(0.2, 0.9, 0.3, 1),
              }}
              progress={progress}
              onSnapToItem={(rawIdx) => {
                const normalizedIdx = ((rawIdx % carouselSlides.length) + carouselSlides.length) % carouselSlides.length;
                setCurrentIndex(normalizedIdx);
                const slide = carouselSlides[normalizedIdx];
                if (slide && slide.id !== selectedTab) {
                  try {
                    playTickSound();
                  } catch {}
                  haptics.impact();
                  setSelectedTab(slide.id);
                }
              }}
              renderItem={({ item, index: itemIdx }) => {
                const isCenter = currentIndex === itemIdx;
                return (
                  <View style={{ width: cardWidth, alignItems: "center" }}>
                    {renderSlideItem(item, isCenter)}
                  </View>
                );
              }}
            />
          </View>

          {/* 3 Pagination Dots underneath */}
          <View style={s.paginationRow}>
            {carouselSlides.map((slide, idx) => {
              const isActive = currentIndex === idx;
              return (
                <TouchableOpacity
                  key={slide.id}
                  onPress={() => {
                    try {
                      playTickSound();
                    } catch {}
                    haptics.tap();
                    carouselRef.current?.scrollTo({ index: idx, animated: true });
                    setCurrentIndex(idx);
                    setSelectedTab(slide.id);
                  }}
                  style={[s.dot, isActive && s.dotActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${slide.title}`}
                />
              );
            })}
          </View>

          {/* ──── CONTENT CONTAINER (Consistent padding and margin on PC) ──── */}
          <View
            style={s.contentContainer}
            onLayout={(e) => { contentContainerYRef.current = e.nativeEvent.layout.y; }}
          >
            {/* ──── 3 PROMOTIONAL BANNERS ROW (Positioned Above Games Section per User Instruction) ──── */}
            <View style={s.bannersWrapper}>
              <PromotionalBannersRow
                isDesktop={true}
                router={router}
                setWithdrawVisible={setWithdrawVisible}
                setShowReferralModal={setShowReferralModal}
                isEN={isEN}
              />
            </View>

            {/* ──────────────── SECTION B: GAMES SECTION ──────────────── */}
            {(() => {
            const normalizedSearch = gamesSearch.trim().toLowerCase();
            const showXo =
              (filterCategory === "all" || filterCategory === "1v1") &&
              (!normalizedSearch ||
                "xo battle tic tac toe classic".includes(normalizedSearch) ||
                normalizedSearch.includes("xo"));

            const showSpin =
              (filterCategory === "all" || filterCategory === "luck") &&
              (!normalizedSearch ||
                "spin & win spin win lucky wheel multiplier".includes(normalizedSearch) ||
                normalizedSearch.includes("spin"));

            const showRps =
              (filterCategory === "all" || filterCategory === "1v1") &&
              (!normalizedSearch ||
                "rps battle rock paper scissors".includes(normalizedSearch) ||
                normalizedSearch.includes("rps") ||
                normalizedSearch.includes("rock") ||
                normalizedSearch.includes("paper") ||
                normalizedSearch.includes("scissor"));

            const visibleCount = (showXo ? 1 : 0) + (showSpin ? 1 : 0) + (showRps ? 1 : 0);

            return (
              <View
                style={s.gamesSection}
                onLayout={(e) => { gamesSectionYRef.current = e.nativeEvent.layout.y; }}
              >
                {/* ──── GAMES HEADER ROW: Title + Search Bar + Category Filters (All, Luck, 1v1) ──── */}
                <View style={s.gamesHeaderRow}>
                  <View style={s.gamesTitleWrap}>
                    <Text style={s.gamesHeading}>Games</Text>
                    <View style={s.gamesCountBadge}>
                      <Text style={s.gamesCountText}>{visibleCount}</Text>
                    </View>
                  </View>

                  <View style={s.gamesControlsRow}>
                    {/* Search Input Box */}
                    <View style={s.gamesSearchBox}>
                      <Ionicons name="search" size={15} color="#8893A7" style={{ marginRight: 6 }} />
                      <TextInput
                        value={gamesSearch}
                        onChangeText={setGamesSearch}
                        placeholder="Search games..."
                        placeholderTextColor="#64748B"
                        style={s.gamesSearchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {gamesSearch.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            try {
                              playTickSound();
                            } catch {}
                            haptics.tap();
                            setGamesSearch("");
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color="#8893A7" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Filter Category Pills: All, Luck, 1v1 */}
                    <View style={s.filterGroup}>
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "luck", label: "Luck" },
                          { id: "1v1", label: "1v1" },
                        ] as const
                      ).map((item) => {
                        const isActive = filterCategory === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              try {
                                playTickSound();
                              } catch {}
                              haptics.tap();
                              setFilterCategory(item.id);
                            }}
                            style={[s.filterBtn, isActive && s.filterBtnActive]}
                            activeOpacity={0.8}
                          >
                            <Text style={[s.filterBtnText, isActive && s.filterBtnTextActive]}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* ──── GAMES CARDS GRID ──── */}
                {visibleCount > 0 ? (
                  <View style={s.gamesGridRow}>
                    {/* 1. XO BATTLE CARD */}
                    {showXo && (
                      <View style={[s.gameCard, highlightedGame === "XO_GAME" && { borderColor: "#00DAF3", borderWidth: 2 }]}>
                        {/* Background Plate */}
                        <Image source={xoBg} style={s.cardBackgroundImg} resizeMode="cover" />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

                        {/* Sized Foreground Art Illustration */}
                        <View style={s.gameCardArtWrap}>
                          <Image source={xoFg} style={s.gameCardArtImg} resizeMode="contain" />
                        </View>

                        {/* Title and Action Buttons */}
                        <View style={s.gameCardInfoWrap}>
                          <Text style={s.gameCardTitle}>XO BATTLE</Text>

                          <View style={s.gameButtonsRow}>
                            <TouchableOpacity
                              onPress={() => {
                                try {
                                  playTickSound();
                                } catch {}
                                haptics.tap();
                                openRoomSheet("STAKES");
                              }}
                              style={s.btnCyan}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnCyanText}>PLAY NOW</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleOpenFriendMatch("xo")}
                              style={s.btnOutline}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnOutlineText}>PLAY WITH FRIENDS</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 2. SPIN & WIN CARD */}
                    {showSpin && (
                      <View style={[s.gameCard, highlightedGame === "SPIN" && { borderColor: "#FF3B57", borderWidth: 2 }]}>
                        <Image source={spinBg} style={s.cardBackgroundImg} resizeMode="cover" />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

                        <View style={s.gameCardArtWrap}>
                          <Image source={spinFg} style={s.gameCardArtImg} resizeMode="contain" />
                        </View>

                        <View style={s.gameCardInfoWrap}>
                          <Text style={s.gameCardTitle}>
                            SPIN <Text style={{ color: "#FF3B57" }}>&</Text> WIN
                          </Text>

                          <View style={s.gameButtonsRow}>
                            <TouchableOpacity
                              onPress={() => {
                                try {
                                  playTickSound();
                                } catch {}
                                haptics.tap();
                                setSpinBetModalVisible(true);
                              }}
                              style={s.btnRed}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnRedText}>REAL SPIN</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                try {
                                  playTickSound();
                                } catch {}
                                haptics.tap();
                                router.push({
                                  pathname: "/(authed)/home/spin",
                                  params: { mode: "5_PLAYER" },
                                } as any);
                              }}
                              style={s.btnOutline}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnOutlineText}>5 PEOPLE</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 3. RPS BATTLE CARD */}
                    {showRps && (
                      <View style={[s.gameCard, highlightedGame === "RPS" && { borderColor: "#F59E0B", borderWidth: 2 }]}>
                        <Image source={rpsBg} style={s.cardBackgroundImg} resizeMode="cover" />
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(5, 8, 15, 0.28)" }]} />

                        <View style={s.gameCardArtWrap}>
                          <Image source={rpsFg} style={s.gameCardArtImg} resizeMode="contain" />
                        </View>

                        <View style={s.gameCardInfoWrap}>
                          <Text style={s.gameCardTitle}>RPS BATTLE</Text>

                          <View style={s.gameButtonsRow}>
                            <TouchableOpacity
                              onPress={() => {
                                try {
                                  playTickSound();
                                } catch {}
                                haptics.tap();
                                setRpsBetModalVisible(true);
                              }}
                              style={s.btnYellow}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnYellowText}>PLAY NOW</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleOpenFriendMatch("rps")}
                              style={s.btnOutline}
                              activeOpacity={0.85}
                            >
                              <Text style={s.btnOutlineText}>PLAY WITH FRIENDS</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={s.noGamesWrap}>
                    <Ionicons name="game-controller-outline" size={36} color="#64748B" />
                    <Text style={s.noGamesText}>
                      No games found matching "{gamesSearch}" in {filterCategory === "all" ? "All" : filterCategory}.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        try {
                          playTickSound();
                        } catch {}
                        haptics.tap();
                        setGamesSearch("");
                        setFilterCategory("all");
                      }}
                      style={s.resetFilterBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={s.resetFilterBtnText}>Show All Games</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}

          <LatestWinningsCard isEN={isEN} style={{ marginTop: 20 }} />
          </View>
        </ScrollView>
      </View>
    </View>
  </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060613",
  },
  layoutRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#060613",
    height: "100%",
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
  },
  bodyContainer: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    gap: 16,
    backgroundColor: "#060613",
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: 24,
    maxWidth: 1600,
    alignSelf: "center",
  },
  bannersWrapper: {
    width: "100%",
    marginTop: 18,
    marginBottom: 6,
  },

  // ──────────────── SECTION A: Featured Carousel ────────────────
  carouselWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  featuredCard: {
    borderRadius: 20,
    backgroundColor: "#111C27",
    borderWidth: 1.5,
    borderColor: "#1E293B",
    overflow: "hidden",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    position: "relative",
  },
  featuredCardCenter: {
    borderColor: "rgba(0, 162, 232, 0.45)",
  },
  cardBackgroundImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  cardBadgeRow: {
    width: "100%",
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  cardBadgeRowEmpty: {
    width: "100%",
    height: 24,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11, 17, 26, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(0, 162, 232, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgePillIcon: {
    color: "#00A2E8",
    fontSize: 10,
    fontWeight: "900",
  },
  badgePillText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  featuredArtWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    marginVertical: 2,
  },
  featuredTextWrap: {
    width: "100%",
    alignItems: "center",
    zIndex: 10,
    marginBottom: 2,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#8893A7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
    textAlign: "center",
  },

  // Pagination Dots
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#1E293B",
  },
  dotActive: {
    width: 24,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F59E0B",
  },

  // ──────────────── SECTION B: Games Section ────────────────
  gamesSection: {
    width: "100%",
    marginTop: 14,
  },
  gamesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  gamesTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gamesHeading: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  gamesCountBadge: {
    backgroundColor: "rgba(0, 218, 243, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 218, 243, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gamesCountText: {
    color: "#00DAF3",
    fontSize: 11,
    fontWeight: "800",
  },
  gamesControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  gamesSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    width: 240,
  },
  gamesSearchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    padding: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C27",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: "#00DAF3",
  },
  filterBtnText: {
    color: "#8893A7",
    fontSize: 12,
    fontWeight: "700",
  },
  filterBtnTextActive: {
    color: "#080C14",
    fontWeight: "900",
  },
  gamesGridRow: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    flexWrap: "wrap",
  },
  gameCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: 420,
    height: 304,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#1E293B",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#111C27",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  noGamesWrap: {
    backgroundColor: "#111C27",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  noGamesText: {
    color: "#8893A7",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 218, 243, 0.15)",
    borderWidth: 1,
    borderColor: "#00DAF3",
    borderRadius: 10,
  },
  resetFilterBtnText: {
    color: "#00DAF3",
    fontSize: 12,
    fontWeight: "800",
  },
  gameCardArtWrap: {
    height: 180,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  gameCardArtImg: {
    width: 200,
    height: 180,
  },
  gameCardInfoWrap: {
    width: "100%",
    zIndex: 5,
    gap: 10,
    alignItems: "center",
  },
  gameCardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  gameButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    alignItems: "center",
  },

  // Button styles matching screenshot colors & typography
  btnCyan: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#00DAF3",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCyanText: {
    color: "#080C14",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnRed: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FF3B57",
    alignItems: "center",
    justifyContent: "center",
  },
  btnRedText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnYellow: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFD200",
    alignItems: "center",
    justifyContent: "center",
  },
  btnYellowText: {
    color: "#080C14",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnOutline: {
    flex: 1.25,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
