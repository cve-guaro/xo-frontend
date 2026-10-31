// app/(authed)/landing.tsx
import { API_URL } from "../../../config";
import ProfileEditModal from "../../../components/ProfileEditModal";
import WelcomeTermsPopup from "../../../components/WelcomeTermsPopup";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import BonusLogsModal from "../../../components/BonusLogsModal";
import ReferralModal from "../../../components/ReferralModal";
import { WebPressable } from "../../../components/WebPressable";
import FriendMatchModal from "../../../components/game/FriendMatchModal";
import IncomingInviteModal from "../../../components/game/IncomingInviteModal";
import RematchTopPopup from "../../../components/game/RematchPopup";
import RulesModal from "../../../components/RulesModal";
import PromotionPopup from "../../../components/PromotionPopup";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import NotificationsPopover from "../../../components/NotificationsPopover";
import SpinWheel from "../../../components/game/SpinWheel";
import { playTickSound, playNotificationChime } from "../../../lib/pinTickAudio";
import WelcomeBonusModal from "../../../components/WelcomeBonusModal";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, G, Text as SvgText, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
  ImageBackground,
} from "react-native";

import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { haptics } from "../../../lib/haptcs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import { useToast } from "../../../context/ToastContext";

const spinCardBordImg = require("../../../assets/images/spin-card bord.png");
const spinBgRedImg = require("../../../assets/images/spin-background-red.png");
const xoBgBlueImg = require("../../../assets/images/xo-background-blue.png");
const xoCardBordImg = require("../../../assets/images/xo-card bord.png");

// Player badge palette for live rooms
const PLAYER_BADGE_COLORS = ["#FF1744", "#00DAF3", "#7C3AED", "#10B981", "#F59E0B"];

// Geometry and Svg Wheel helpers for Mobile layout
const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const getArcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
};

function SpinWheelSvg({ size, faded, mode, hidePointer }: { size: number; faded?: boolean; mode?: "5_PLAYER" | "RAIL"; hidePointer?: boolean }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.40;

  let sectors = [];
  if (mode === "RAIL") {
    sectors = [
      { value: "15%", sub: "Bonus", color: "#a855f7", angle: 54 },
      { value: "25%", sub: "Bonus", color: "#22c55e", angle: 90 },
      { value: "10%", sub: "Bonus", color: "#22d3ee", angle: 36 },
      { value: "35%", sub: "Bonus", color: "#f97316", angle: 126 },
      { value: "15%", sub: "Bonus", color: "#ef4444", angle: 54 },
    ];
  } else {
    sectors = [
      { value: "20%", sub: "Bonus", color: "#22d3ee", angle: 72 },
      { value: "20%", sub: "Bonus", color: "#f97316", angle: 72 },
      { value: "20%", sub: "Bonus", color: "#ef4444", angle: 72 },
      { value: "20%", sub: "Bonus", color: "#a855f7", angle: 72 },
      { value: "20%", sub: "Bonus", color: "#22c55e", angle: 72 },
    ];
  }

  let accumulatedAngle = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: faded ? 0.35 : 1 }}>
      {!faded && (
        <Defs>
          <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
            <Stop offset="70%" stopColor="#7c3aed" stopOpacity={0.1} />
            <Stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </RadialGradient>
        </Defs>
      )}
      {!faded && <Circle cx={cx} cy={cy} r={r * 1.35} fill="url(#wheelGlow)" />}
      {/* Slices */}
      <G>
        {sectors.map((sec, idx) => {
          const startAngle = accumulatedAngle;
          const endAngle = accumulatedAngle + sec.angle;
          accumulatedAngle = endAngle;
          const textAngle = startAngle + sec.angle / 2;
          const textPos = polarToCartesian(cx, cy, r * 0.68, textAngle);
          const subPos = polarToCartesian(cx, cy, r * 0.48, textAngle);
          return (
            <G key={idx}>
              <Path d={getArcPath(cx, cy, r, startAngle, endAngle)} fill={sec.color} stroke="#0f1122" strokeWidth={1.8} />
              {!faded && (
                <>
                  <SvgText
                    x={textPos.x}
                    y={textPos.y}
                    fill="#ffffff"
                    fontSize={size * 0.048}
                    fontWeight="900"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {sec.value}
                  </SvgText>
                  <SvgText
                    x={subPos.x}
                    y={subPos.y}
                    fill="rgba(255,255,255,0.85)"
                    fontSize={size * 0.03}
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {sec.sub}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </G>

      {/* Gold Metallic Rim */}
      <Circle cx={cx} cy={cy} r={r * 0.98} stroke="#f5b642" strokeWidth={size * 0.05} fill="none" />
      <Circle cx={cx} cy={cy} r={r * 1.01} stroke="#c59b27" strokeWidth={size * 0.008} fill="none" />
      <Circle cx={cx} cy={cy} r={r * 0.95} stroke="#c59b27" strokeWidth={size * 0.008} fill="none" />

      {/* Rim Studs / Glowing LED Bulbs */}
      {Array.from({ length: 18 }).map((_, idx) => {
        const angle = idx * 20;
        const pos = polarToCartesian(cx, cy, r * 0.98, angle);
        return (
          <G key={idx}>
            <Circle cx={pos.x} cy={pos.y} r={size * 0.018} fill="#fef08a" stroke="#ca8a04" strokeWidth={0.8} />
            <Circle cx={pos.x} cy={pos.y} r={size * 0.009} fill="#ffffff" />
          </G>
        );
      })}

      {/* Gold Center Pin Hub labeled "SPIN" */}
      <Circle cx={cx} cy={cy} r={r * 0.26} fill="#141126" stroke="#f5b642" strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={r * 0.22} fill="#0d0b1a" stroke="#ffe599" strokeWidth={1} />
      {!faded && (
        <SvgText
          x={cx}
          y={cy + 1}
          fill="#f5b642"
          fontSize={size * 0.045}
          fontWeight="900"
          textAnchor="middle"
          alignmentBaseline="middle"
          letterSpacing={1}
        >
          SPIN
        </SvgText>
      )}

      {/* Pointer */}
      {!faded && !hidePointer && (
        <G transform={`rotate(180, ${cx}, ${cy - r * 1.02})`}>
          <Path
            d={`M ${cx} ${cy - r * 1.02} L ${cx - 12} ${cy - r * 1.16} L ${cx + 12} ${cy - r * 1.16} Z`}
            fill="#f5b642"
            stroke="#c59b27"
            strokeWidth={1.5}
          />
        </G>
      )}
    </Svg>
  );
}

// ── Extracted components (Stage 3 refactor) ──
import { ROOMS, DEMO_BOARD, BOARD_SIZE } from "../../../components/game/gameplayConstants";
import type { RoomConfig, SheetStep } from "../../../components/game/gameplayConstants";
import { HeaderPill, InfoPill } from "../../../components/game/HeaderPill";
import BoardDemo from "../../../components/game/BoardDemo";
import ExitModal from "../../../components/game/ExitModal";
import SearchingView from "../../../components/game/SearchingView";
import RoomSheet from "../../../components/game/RoomSheet";
import SpinBetSelectModal from "../../../components/game/SpinBetSelectModal";
import MobileQuickTile from "../../../components/game/MobileQuickTile";
import DesktopLayout from "../../../components/game/DesktopLayout";
import WinTicker from "../../../components/game/WinTicker";
import FloatingActions from "../../../components/game/FloatingActions";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { LobbyHeader } from "../../../components/game/LobbyHeader";
import { WeeklyPodium } from "../../../components/game/WeeklyPodium";
import { SocialProofCard } from "../../../components/game/SocialProofCard";
import { LiveWinToast } from "../../../components/game/LiveWinToast";
import { SegmentedTabs, CtaButton } from "../../../theme/ui";
import { colors } from "../../../theme/tokens";






// Session tracker for promotion popup to prevent showing it on web page tab transitions
let hasShownPromoThisSession = false;

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // Infinite slow rotation animation for home screen wheels
  const idleSpinAnim = useRef(new Animated.Value(0)).current;
  const carouselAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const [welcomeBonusModalVisible, setWelcomeBonusModalVisible] = useState(false);
  useEffect(() => {
    Animated.loop(
      Animated.timing(idleSpinAnim, {
        toValue: 1,
        duration: 25000, // 25 seconds for a smooth, slow rotation
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      })
    ).start();
  }, []);

  const idleSpinRotate = idleSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Promotion Popup & Scrolling Ticker States
  const [promoConfig, setPromoConfig] = useState<any>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [tickerList, setTickerList] = useState<string[]>([]);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [currentWinAnnouncement, setCurrentWinAnnouncement] = useState<string | null>(null);
  const [hideInstallBanner, setHideInstallBanner] = useState(false);

  const fetchActivePromo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/promo-popup/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.popup) {
          setPromoConfig(data.popup);
          setShowPromo(true);
        } else {
          setShowPromo(false);
        }
      }
    } catch (e) {
      console.error('[Landing] fetch active promo error:', e);
    }
  }, []);

  const fetchTickerFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/leaderboard/ticker`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ticker)) {
          setRawTickerList(data.ticker);
          const formatted = data.ticker.map((item: any) => {
            const amt = Number(item.amount) || 0;
            let emoji = '⚡';
            if (amt >= 500) emoji = '👑';
  else if (amt >= 200) emoji = '🔥';
  else if (amt >= 100) emoji = '🏆';
            return `${emoji} ${item.username.toUpperCase()} WON ${amt} Birr`;
          });
          setTickerList(formatted);
        }
      }
    } catch (e) {
      console.error('[Landing] fetch ticker error:', e);
    }
  }, []);
  const isTablet = Platform.OS === "web" && width >= 768 && width < 1024;
  const isLargeScreen = isDesktop || isTablet;
  const { ensureConnected, findMatch, cancelFind, isSearching, onMessage, send } = useSocket();
  const { user, token, booting, refreshProfile, language, switchLanguage, t, showAlert, fixUrl, activeGameMode, setActiveGameMode } = useAuth();
  const { isPlaying: bgMusicPlaying, toggleMusic } = useBackgroundMusic();


  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).deferredPrompt : null
  );
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const winTickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const checkPwaInstalled = async () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone;
      if (isStandalone) return true;

      if ((navigator as any).getInstalledRelatedApps) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            return true;
          }
        } catch (e) {
          console.log('[PWA Gameplay] getInstalledRelatedApps error:', e);
        }
      }
      return false;
    };

    const handleCheck = () => {
      checkPwaInstalled().then(installed => {
        setIsPwaInstalled(installed);
      });
    };

    handleCheck();

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPwaInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    // Event listeners (appinstalled + mediaQuery change) fully cover install detection.
    // Removed: 3-second setInterval polling — was ~20 async calls/min for no benefit.

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const appPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!deferredPrompt) {
      appPulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(appPulseAnim, {
          toValue: 1.06,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(appPulseAnim, {
          toValue: 1.0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [deferredPrompt]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleReady = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-prompt-ready', handleReady);

    // Check if already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', handleReady);
    };
  }, []);
  const isEN = language === "en";
  const isBanned = !!(user as any)?.banned;
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalBonusEarned: 0 });
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [rulesVisible, setRulesVisible] = useState(false);
  const params = useLocalSearchParams();
  const [selectedTab, setSelectedTab] = useState<"SPIN" | "XO_GAME" | "COMING_SOON">(activeGameMode === "xo" ? "XO_GAME" : "SPIN");
  const [hasClaimedWelcomeBonus, setHasClaimedWelcomeBonus] = useState(false);
  const mobileCarouselRef = useRef<ScrollView>(null);
  const scrollSyncTimeout = useRef<any>(null);

  useEffect(() => {
    if (selectedTab !== "COMING_SOON") setSelectedTab(activeGameMode === "xo" ? "XO_GAME" : "SPIN");
  }, [activeGameMode]);
  const [spinMode, setSpinMode] = useState<"5_PLAYER" | "RAIL">("5_PLAYER");
  const [showMobileStakeModal, setShowMobileStakeModal] = useState(false);
  const [mobileStakeInput, setMobileStakeInput] = useState("50");
  const [spinError, setSpinError] = useState<string | null>(null);
  const toast = useToast();
  const [incomingInvite, setIncomingInvite] = useState<any>(null);

  // Notifications and Weekly Leaderboard states
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [rawTickerList, setRawTickerList] = useState<any[]>([]);
  const [myWeeklyRank, setMyWeeklyRank] = useState<any | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyPrizes, setWeeklyPrizes] = useState<any[]>([
    { rank: 1, amount: 500 },
    { rank: 2, amount: 300 },
    { rank: 3, amount: 200 },
  ]);

  // Win announcements rotation states (vertical fading ticker)
  const tickerAnim = useRef(new Animated.Value(0)).current;
  const [tickerIdx, setTickerIdx] = useState(0);

  // Collapsible Floating actions bar state
  const [floatingExpanded, setFloatingExpanded] = useState(false);
  const floatingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(floatingAnim, {
      toValue: floatingExpanded ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [floatingExpanded]);

  const handleMobileSpinNow = async () => {
    setShowMobileStakeModal(true);
  };

  const handleConfirmMobileRailSpin = async (stakeVal: number) => {
    if (isNaN(stakeVal) || stakeVal <= 0) {
      setSpinError(isEN ? "Invalid stake amount" : "ትክክለኛ ያልሆነ መጠን");
      return;
    }
    if (balance < stakeVal) {
      setSpinError(isEN ? "Insufficient balance" : "በቂ ሂሳብ የሎትም");
      return;
    }
    setShowMobileStakeModal(false);
    router.push({
      pathname: '/(authed)/home/spin',
      params: { mode: "RAIL", stake: String(stakeVal) }
    } as any);
  };

  const fetchWeeklyLeaderboard = useCallback(async () => {
    if (!token) return;
    setLoadingWeekly(true);
    try {
      const res = await fetch(`${API_URL}/leaderboard/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyLeaderboard(data.leaderboard || []);
        setMyWeeklyRank(data.myRank || null);
        if (data.prizes) setWeeklyPrizes(data.prizes);
        if (data.secondsRemaining !== undefined) {
          setSecondsRemaining(data.secondsRemaining);
        }
      }
    } catch (e) {
      console.error("Weekly leaderboard fetch error in gameplay:", e);
    } finally {
      setLoadingWeekly(false);
    }
  }, [token]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining > 0]);

  useEffect(() => {
    fetchWeeklyLeaderboard();
  }, [fetchWeeklyLeaderboard]);

  useEffect(() => {
    if (tickerList.length === 0) return;
    const timer = setInterval(() => {
      tickerAnim.setValue(0);
      Animated.timing(tickerAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setTickerIdx((prev) => (prev + 1) % tickerList.length);
        tickerAnim.setValue(0);
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [tickerAnim, tickerList]);


  // Global rematch state — shows popup even when on home page
  const [globalRematchOffer, setGlobalRematchOffer] = useState<{ visible: boolean; fromName?: string; amount?: number; fromUserId?: string } | null>(null);

  // Friend Match — send invite via socket
  const handleSendInvite = useCallback(async (username: string, betAmount: number) => {
    if (!token) return;
    await ensureConnected(token);
    send('friend_invite', { token, targetUsername: username, betAmount });
  }, [token, send, ensureConnected]);

  // Listen for friend invite results and incoming invites
  useEffect(() => {
    const off = onMessage((msg: any) => {
      if (msg.type === 'friend_invite_result') {
        setInviteResult(msg.payload);
      } else if (msg.type === 'friend_invite_declined') {
        const declinedBy = msg.payload?.byUsername || 'Your friend';
        toast.info(`${declinedBy} declined your challenge!`);
        // Update inviteResult so FriendMatchModal shows the decline clearly
        setInviteResult((prev: any) => ({ ...prev, declined: true, declinedByUsername: declinedBy }));
      }
    });
    return () => { try { off(); } catch { } };
  }, [onMessage, toast]);

  // Listen for global real-time win announcements from the socket
  useEffect(() => {
    const off = onMessage((msg: any) => {
      if (msg.type === "global_win") {
        const payload = msg.payload || {};
        const username = String(payload.username || "User").toUpperCase();
        const amt = Number(payload.amount) || 0;
        let emoji = '⚡';
        if (amt >= 500) emoji = '👑';
  else if (amt >= 200) emoji = '🔥';
  else if (amt >= 100) emoji = '🏆';

        setCurrentWinAnnouncement(`${emoji} ${username} WON ${amt} Birr`);
      }
    });
    return () => {
      try { off(); } catch { }
    };
  }, [onMessage]);

  useEffect(() => {
    if (!currentWinAnnouncement) return;

    // Reset animation to 0 (hidden at bottom)
    winTickerAnim.setValue(0);

    // Slide in to middle (0 to 1)
    Animated.timing(winTickerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.back(1.0)),
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Slide out to top and fade out (1 to 2) after 4.1s
    const exitTimer = setTimeout(() => {
      Animated.timing(winTickerAnim, {
        toValue: 2,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setCurrentWinAnnouncement(null);
      });
    }, 4100);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [currentWinAnnouncement]);

  const handleInviteResponse = useCallback((accept: boolean) => {
    if (!incomingInvite || !token) return;
    send('friend_invite_response', {
      token,
      senderId: incomingInvite.fromUserId,
      accept,
      betAmount: incomingInvite.betAmount
    });
    setIncomingInvite(null);
  }, [incomingInvite, token, send]);

  // Auto-expire incoming friend invite popup after 45 seconds
  useEffect(() => {
    if (!incomingInvite) return;
    const timer = setTimeout(() => {
      // Auto-decline so sender gets notified
      if (incomingInvite?.fromUserId && token) {
        send('friend_invite_response', {
          token,
          senderId: incomingInvite.fromUserId,
          accept: false,
          betAmount: incomingInvite.betAmount
        });
      }
      setIncomingInvite(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [incomingInvite, token, send]);

  // Global rematch accept/decline (for when user is on home page)
  const handleGlobalRematchAccept = useCallback(() => {
    if (!globalRematchOffer?.fromUserId || !token) return;
    send('rematch_response', {
      token,
      opponentId: globalRematchOffer.fromUserId,
      amount: globalRematchOffer.amount,
      accept: true,
    });
    setGlobalRematchOffer(null);
  }, [globalRematchOffer, token, send]);

  const handleGlobalRematchDecline = useCallback(() => {
    if (!globalRematchOffer?.fromUserId || !token) return;
    send('rematch_response', {
      token,
      opponentId: globalRematchOffer.fromUserId,
      amount: globalRematchOffer.amount,
      accept: false,
    });
    setGlobalRematchOffer(null);
  }, [globalRematchOffer, token, send]);

  const [appConfig, setAppConfig] = useState<{ referral_enabled?: boolean; rooms_locked?: boolean }>({ referral_enabled: false, rooms_locked: false });
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/account/config`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setAppConfig(data))
        .catch(() => { });
    }
  }, [token]);

  // params is declared at component top

  // ensureConnected is handled by the parent _layout.tsx (authed) — no need to duplicate here

  // Auto-open share modal from deep links
  useEffect(() => {
    if (params.modal === 'share') {
      setShowReferralModal(true);
    }
  }, [params.modal]);

  // ---------- auto-refresh balance when page gains focus ----------
  // This handles post-payment redirects from Chapa and returning from deposit/withdraw screens
  useFocusEffect(
    useCallback(() => {
      if (token && refreshProfile) {
        refreshProfile().catch(() => { });
      }
      fetchTickerFeed();
    }, [token, refreshProfile, fetchTickerFeed])
  );

  // Reset promo session tracker on logout
  useEffect(() => {
    if (!token) {
      hasShownPromoThisSession = false;
    }
  }, [token]);

  // Fetch promo popup and ticker feed only on app mount / refresh / login (not on focus shifts)
  useEffect(() => {
    if (!hasShownPromoThisSession) {
      fetchActivePromo();
      hasShownPromoThisSession = true;
    }
    fetchTickerFeed();
  }, [fetchActivePromo, fetchTickerFeed]);

  // Periodic polling for ticker wins (socket global_win events also feed the ticker live)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchTickerFeed();
    }, 90_000); // 90 seconds (was 30s — socket real-time wins reduce need)
    return () => clearInterval(interval);
  }, [token, fetchTickerFeed]);

  // ---------- welcome terms ----------
  const [termsVisible, setTermsVisible] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    if (!user || !user.id || termsChecked) return;
    const checkTerms = async () => {
      try {
        const agreed = await AsyncStorage.getItem(`agreed_terms_${user.id}`);
        const welcomeShown = await AsyncStorage.getItem(`welcome_shown_${user.id}`);
        // Only show for new users who have bonus_balance > 0 AND are marked as new_user
        // and haven't agreed to terms yet AND haven't seen welcome bonus
        const isNewUser = (user as any)?.new_user === true;
        const hasBonus = (user as any)?.bonus_balance > 0;

        if (agreed !== 'true' && hasBonus && isNewUser && welcomeShown !== 'true') {
          setTermsVisible(true);
        }
        setTermsChecked(true);
      } catch { }
    };
    checkTerms();
  }, [user, termsChecked]);

  const handleAgreeTerms = useCallback(async () => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(`agreed_terms_${user.id}`, 'true');
      await AsyncStorage.setItem(`welcome_shown_${user.id}`, 'true');
      setTermsVisible(false);
      haptics.success();
    } catch { }
  }, [user]);

  // -- DESKTOP EXACT MATCH NAVIGATOR --
  useEffect(() => {
    if (!isLargeScreen) return; // Handled directly in `waiting.tsx` for smaller devices
    const off = onMessage((msg: any) => {
      try {
        if (msg.type === "match_found") {
          setMatchFound(true);
          const { matchId, symbol, opponentUsername, opponentAvatar, houseCutPercent, timerDuration, betAmount: bkAmount, youAre } = msg.payload || {};
          if (!matchId) return;
          router.replace({
            pathname: "/game/room",
            params: {
              id: String(matchId),
              symbol: String(symbol || youAre || "X"),
              vs: String(opponentUsername || "Opponent"),
              oppId: msg.payload?.opponentId || "",
              opponentAvatar: opponentAvatar || "",
              amount: String(bkAmount || 50),
              time: String(timerDuration || 30),
              _k: String(Date.now()),
            },
          } as any);
        }
      } catch { }
    });
    return () => {
      try { off(); } catch { }
    };
  }, [isLargeScreen, onMessage, router]);

  // Poll profile while banned so the UI auto-recovers when admin unbans
  useEffect(() => {
    if (!isBanned) return;
    const timer = setInterval(() => { refreshProfile().catch(() => { }); }, 60_000); // 60s (was 30s)
    return () => clearInterval(timer);
  }, [isBanned, refreshProfile]);

  // ---------- sound (click only — background managed by BackgroundMusicProvider) ----------

  const playClick = useCallback(async () => {
    if (!bgMusicPlaying) return;
    try {
      playTickSound();
    } catch { }
  }, [bgMusicPlaying]);

  const handleAppDownload = useCallback(async () => {
    haptics.tap();
    await playClick();

    const isTelegram = Platform.OS === 'web' && typeof navigator !== 'undefined' && /telegram/i.test(navigator.userAgent);
    if (isTelegram) {
      setPwaModalVisible(true);
      return;
    }

    if (Platform.OS === 'web' && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') (window as any).deferredPrompt = null;
      });
      return;
    }

    if (Platform.OS === 'web') {
      setPwaModalVisible(true);
      return;
    }

    const url = 'https://xoethiopia.com/xoet.apk';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('https://xoethiopia.com');
      }
    } catch (err) {
      console.error("Failed to open app download URL", err);
      Linking.openURL('https://xoethiopia.com');
    }
  }, [playClick, deferredPrompt]);



  // ---------- exit modal ----------
  const [exitModalVisible, setExitModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const backAction = () => {
        setExitModalVisible(true);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => sub.remove();
    }, [])
  );

  const confirmExit = useCallback(async () => {
    await playClick();
    setExitModalVisible(false);
    if (Platform.OS === "android") BackHandler.exitApp();
  }, [playClick]);

  const cancelExit = useCallback(async () => {
    await playClick();
    setExitModalVisible(false);
  }, [playClick]);

  // ---------- header animation ----------
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [txHistory, setTxHistory] = useState<any[]>([]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/account/history`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 4 })
    })
      .then(res => res.json())
      .then(d => {
        if (d.ok && Array.isArray(d.history)) setTxHistory(d.history);
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 6, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    a.start();
    return () => {
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);

  const balance = useMemo(() => Number(user?.available_balance ?? 0), [user]);

  // stats & rank logic (matches account.tsx)
  const gamesPlayed = (user as any)?.total_games ?? 0;
  const wins = (user as any)?.total_wins ?? 0;
  const winRate = useMemo(() => (gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0), [wins, gamesPlayed]);
  const statsLabel = useMemo(() => {
    const wr = Math.min(Math.max(winRate, 0), 100);
    return isEN ? `${wins} wins • ${wr}% win rate` : `${wins} ድሎች • ${wr}% የማሸነፍ መጠን`;
  }, [wins, winRate, isEN]);

  const rank = useMemo(() => {
    if (winRate >= 70 || wins >= 200) return isEN ? "Platinum" : "ፕላቲነም";
    if (winRate >= 50 || wins >= 100) return isEN ? "Gold" : "ወርቅ";
    return isEN ? "Silver" : "ብር";
  }, [winRate, wins, isEN]);

  const rankMeta = useMemo(() => {
  const isPlat = rank.includes("Platinum") || rank.includes("ፕላቲነም");
    const isGold = rank.includes("Gold") || rank.includes("ወርቅ");
    if (isPlat) return { icon: "diamond-outline" as const, label: rank, tone: "platinum" as const };
    if (isGold) return { icon: "trophy-outline" as const, label: rank, tone: "gold" as const };
    return { icon: "medal-outline" as const, label: rank, tone: "silver" as const };
  }, [rank]);

  const hasBonus = !!((user as any)?.bonus_balance > 0 || !(user as any)?.new_user);

  // ---------- handlers ----------
  const handleRefreshProfile = useCallback(async () => {
    haptics.tap();
    await playClick();
    try {
      await refreshProfile(true);
      toast.success(isEN ? "Balance Updated" : "ሂሳብዎ ታድሷል", undefined, 1500);
    } catch (e) {
      toast.error(isEN ? "Refresh Failed" : "ማደስ አልተቻለም", isEN ? "Could not update your balance." : "የመለያ ሂሳብዎን ማደስ አልተቻለም።");
      console.log("Error refreshing profile:", e);
    }
  }, [playClick, refreshProfile, isEN, toast]);

  const handleLanguageToggle = useCallback(async () => {
    haptics.selection("soft");
    await switchLanguage();
  }, [switchLanguage]);

  const handleToggleSound = useCallback(async () => {
    haptics.selection("soft");
    await toggleMusic();
  }, [toggleMusic]);

  const goReplace = useCallback(
    async (path: string) => {
      await playClick();
      router.replace(path as any);
    },
    [playClick, router]
  );

  // ---------- Room Sheet ----------
  const [roomSheetVisible, setRoomSheetVisible] = useState(false);
  const [sheetInitialView, setSheetInitialView] = useState<"STAKES" | "FRIENDS">("STAKES");
  const [sheetStep, setSheetStep] = useState<SheetStep>("ROOMS");
  const [selectedRoomId, setSelectedRoomId] = useState<RoomConfig["id"]>("R1");
  const [spinBetModalVisible, setSpinBetModalVisible] = useState(false);

  const selectedRoom = useMemo(() => ROOMS.find((r) => r.id === selectedRoomId) || ROOMS[0], [selectedRoomId]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(520)).current;

  const openRoomSheet = useCallback(async (initialMode: "STAKES" | "FRIENDS" = "STAKES") => {
    haptics.tap();
    await playClick();
    setSheetInitialView(initialMode);
    setSheetStep("ROOMS");
    setRoomSheetVisible(true);

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(520);

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [backdropOpacity, playClick, sheetTranslateY]);

  const closeRoomSheet = useCallback(async () => {
    haptics.tap();
    await playClick();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sheetTranslateY, {
        toValue: 520,
        duration: 100,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setRoomSheetVisible(false);
      setSheetStep("ROOMS");
      if (params.openRooms === 'true') {
        router.setParams({ openRooms: undefined });
      }
    });
  }, [backdropOpacity, sheetTranslateY, params, router]);

  useEffect(() => {
    if (params.openRooms === "true") {
      openRoomSheet();
    }
  }, [params.openRooms, openRoomSheet]);

  const onSelectRoom = useCallback(async (roomId: RoomConfig["id"]) => {
    if (appConfig.rooms_locked) {
      showAlert('Rooms Locked', 'All game rooms are currently locked by the admin. Please try again later.');
      return;
    }
    haptics.selection("soft");
    await playClick();
    setSelectedRoomId(roomId);
    setSheetStep("AMOUNTS");
  }, [playClick]);

  const goBackToRooms = useCallback(async () => {
    haptics.selection("soft");
    await playClick();
    setSheetStep("ROOMS");
  }, [playClick]);

  const selectAmount = useCallback(
    async (room: RoomConfig, min: number, max: number) => {
      haptics.tap();
      await playClick();
      if (Number.isFinite(balance) && balance < min) {
        haptics.warning();
        toast.warning(
      isEN ? "Insufficient Balance" : "በቂ ሂሳብ የሎትም",
          isEN ? `You need at least ETB ${min} to play. Deposit more funds.` : `ለመጫወት ቢያንስ ETB ${min} ያስፈልግዎታል ተጨማሪ ገንዘብ ያስገቡ`
        );
        return;
      }

      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 60, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(sheetTranslateY, { toValue: 520, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(async () => {
        setRoomSheetVisible(false);
        setSheetStep("ROOMS");

        if (isDesktop) {
          // Sync desktop to use the same mobile waiting screen UX 
          // to match the requested phone-size UI design
          router.replace({
            pathname: "/game/waiting",
            params: {
              betMin: String(min),
              betMax: String(max),
              amount: String(max),
              token: String(token || ""),
              roomId: room.id,
              cut: String(room.cut),
              time: String(room.time),
            },
          } as any);
        } else {
          router.replace({
            pathname: "/game/waiting",
            params: {
              betMin: String(min),
              betMax: String(max),
              amount: String(max),
              token: String(token || ""),
              roomId: room.id,
              cut: String(room.cut),
              time: String(room.time),
            },
          } as any);
        }
      });
    },
    [backdropOpacity, balance, router, sheetTranslateY, token]
  );



  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.bootText}>{t("loading")}</Text>
      </View>
    );
  }


  if (isLargeScreen) {
    return (
      <View style={{ flex: 1 }}>
        <DesktopLayout
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          user={user}
          token={token}
          balance={balance}
          language={language}
          isDesktop={isDesktop}
          isTablet={isTablet}
          isBanned={isBanned}
          isSearching={isSearching}
          isEN={isEN}
          weeklyLeaderboard={weeklyLeaderboard}
          weeklyPrizes={weeklyPrizes}
          loadingWeekly={loadingWeekly}
          secondsRemaining={secondsRemaining}
          winRate={winRate}
          rankMeta={rankMeta}
          rawTickerList={rawTickerList}
          roomSheetVisible={roomSheetVisible}
          sheetStep={sheetStep}
          selectedRoom={selectedRoom}
          backdropOpacity={backdropOpacity}
          sheetTranslateY={sheetTranslateY}
          userCaps={{ r1_10_wins: (user as any)?.r1_10_wins, r1_15_wins: (user as any)?.r1_15_wins, r1_25_wins: (user as any)?.r1_25_wins, r1_50_wins: (user as any)?.r1_50_wins, r1_99_wins: (user as any)?.r1_99_wins, rooms_locked: appConfig.rooms_locked }}
          depositVisible={depositVisible}
          withdrawVisible={withdrawVisible}
          friendModalVisible={friendModalVisible}
          pwaModalVisible={pwaModalVisible}
          showReferralModal={showReferralModal}
          showPromo={showPromo}
          inviteResult={inviteResult}
          promoConfig={promoConfig}
          setDepositVisible={setDepositVisible}
          setWithdrawVisible={setWithdrawVisible}
          setFriendModalVisible={setFriendModalVisible}
          setPwaModalVisible={setPwaModalVisible}
          setShowReferralModal={setShowReferralModal}
          setShowPromo={setShowPromo}
          setInviteResult={setInviteResult}
          openRoomSheet={openRoomSheet}
          closeRoomSheet={closeRoomSheet}
          goBackToRooms={goBackToRooms}
          onSelectRoom={onSelectRoom}
          selectAmount={selectAmount}
          refreshProfile={refreshProfile}
          handleLanguageToggle={handleLanguageToggle}
          handleSendInvite={handleSendInvite}
          router={router}
          appConfig={appConfig}
          unreadCount={unreadCount}
          setNotificationsVisible={setNotificationsVisible}
          bgMusicPlaying={bgMusicPlaying}
          onToggleSound={handleToggleSound}
        />
        {/* Render all shared modals here so they are active on desktop */}
        <NotificationsPopover
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          onUnreadCountChange={setUnreadCount}
        />
        <IncomingInviteModal
          invite={incomingInvite}
          onAccept={() => handleInviteResponse(true)}
          onDecline={() => handleInviteResponse(false)}
        />
        <RematchTopPopup
          visible={!!globalRematchOffer?.visible}
          fromName={globalRematchOffer?.fromName}
          amount={globalRematchOffer?.amount}
          onAccept={handleGlobalRematchAccept}
          onDecline={handleGlobalRematchDecline}
        />
        {exitModalVisible && <ExitModal language={language} onCancel={cancelExit} onConfirm={confirmExit} />}
      </View>
    );
  }

  // ── Mobile return (Fintech + Luxury Gaming UI) ──
  return (
    <View style={{ flex: 1, backgroundColor: "#060613" }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={[styles.scroll, { flexGrow: 1, paddingBottom: 72 }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* 1. Header & Total Balance Card */}
          <LobbyHeader
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            user={user}
            isEN={isEN}
            isPwaInstalled={isPwaInstalled}
            appPulseAnim={appPulseAnim}
            deferredPrompt={deferredPrompt}
            handleAppDownload={handleAppDownload}
            handleLanguageToggle={handleLanguageToggle}
            setNotificationsVisible={setNotificationsVisible}
            unreadCount={unreadCount}
            balance={balance}
            handleRefreshProfile={handleRefreshProfile}
            goReplace={goReplace}
            compactBalance={true}
          />

          {/* 2. Mode Switcher Tabs (SPIN vs XO vs COMING SOON) */}
          {(() => {
            const cardWidth = Math.min(width * 0.84, 330);
            const cardGap = 14;
            const cardInterval = cardWidth + cardGap;
            const sideSpacer = Math.max(16, (width - cardWidth) / 2);

            const isBonusClaimed = Boolean(
              hasClaimedWelcomeBonus ||
              ((user as any)?.claimed_giveaway_version && Number((user as any).claimed_giveaway_version) > 0) ||
              (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage?.getItem('xoet_bonus_claimed') === 'true')
            );

            // Interpolations for 3 cards
            const spinCardScale = scrollX.interpolate({
              inputRange: [-cardInterval, 0, cardInterval],
              outputRange: [0.88, 1.0, 0.88],
              extrapolate: 'clamp',
            });
            const spinCardOpacity = scrollX.interpolate({
              inputRange: [-cardInterval, 0, cardInterval],
              outputRange: [0.65, 1.0, 0.65],
              extrapolate: 'clamp',
            });

            const xoCardScale = scrollX.interpolate({
              inputRange: [0, cardInterval, cardInterval * 2],
              outputRange: [0.88, 1.0, 0.88],
              extrapolate: 'clamp',
            });
            const xoCardOpacity = scrollX.interpolate({
              inputRange: [0, cardInterval, cardInterval * 2],
              outputRange: [0.65, 1.0, 0.65],
              extrapolate: 'clamp',
            });

            const soonCardScale = scrollX.interpolate({
              inputRange: [cardInterval, cardInterval * 2, cardInterval * 3],
              outputRange: [0.88, 1.0, 0.88],
              extrapolate: 'clamp',
            });
            const soonCardOpacity = scrollX.interpolate({
              inputRange: [cardInterval, cardInterval * 2, cardInterval * 3],
              outputRange: [0.65, 1.0, 0.65],
              extrapolate: 'clamp',
            });

            // 3-dot Pill Pagination
            const dot0Width = scrollX.interpolate({
              inputRange: [0, cardInterval],
              outputRange: [24, 8],
              extrapolate: 'clamp',
            });
            const dot0Opacity = scrollX.interpolate({
              inputRange: [0, cardInterval],
              outputRange: [1, 0.35],
              extrapolate: 'clamp',
            });

            const dot1Width = scrollX.interpolate({
              inputRange: [0, cardInterval, cardInterval * 2],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dot1Opacity = scrollX.interpolate({
              inputRange: [0, cardInterval, cardInterval * 2],
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            const dot2Width = scrollX.interpolate({
              inputRange: [cardInterval, cardInterval * 2],
              outputRange: [8, 24],
              extrapolate: 'clamp',
            });
            const dot2Opacity = scrollX.interpolate({
              inputRange: [cardInterval, cardInterval * 2],
              outputRange: [0.35, 1],
              extrapolate: 'clamp',
            });

            const handleTabPress = (tab: "SPIN" | "XO_GAME" | "COMING_SOON") => {
              try { playTickSound(); } catch {}
              haptics.tap();
              setSelectedTab(tab);
              if (tab === "SPIN") {
                setActiveGameMode("spin");
              } else {
                setActiveGameMode("xo");
              }
              router.setParams({ tab });
              const targetX = tab === "SPIN" ? 0 : tab === "XO_GAME" ? cardInterval : cardInterval * 2;
              mobileCarouselRef.current?.scrollTo({
                x: targetX,
                animated: true,
              });
            };

            // Top 3 champions for the weekly showcase
            const champions = [
              {
                rank: 1,
                username: weeklyLeaderboard[0]?.username || "Dawit_K",
                avatar: weeklyLeaderboard[0]?.avatar,
                prize: weeklyPrizes[0]?.amount || 500,
                color: "#f5b642",
                badge: "👑 1st",
                bg: "rgba(245, 182, 66, 0.12)",
                border: "rgba(245, 182, 66, 0.45)",
              },
              {
                rank: 2,
                username: weeklyLeaderboard[1]?.username || "Abebe_M",
                avatar: weeklyLeaderboard[1]?.avatar,
                prize: weeklyPrizes[1]?.amount || 300,
                color: "#cbd5e1",
                badge: "🥈 2nd",
                bg: "rgba(203, 213, 225, 0.1)",
                border: "rgba(203, 213, 225, 0.35)",
              },
              {
                rank: 3,
                username: weeklyLeaderboard[2]?.username || "Helen_T",
                avatar: weeklyLeaderboard[2]?.avatar,
                prize: weeklyPrizes[2]?.amount || 200,
                color: "#fb923c",
                badge: "🥉 3rd",
                bg: "rgba(251, 146, 60, 0.1)",
                border: "rgba(251, 146, 60, 0.35)",
              },
            ];

            return (
              <View style={{ width: "100%" }}>
                {/* 3 Top Mode Tabs */}
                <View style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(15, 20, 35, 0.75)",
                  borderRadius: 16,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  marginTop: 10,
                  marginBottom: 16,
                  gap: 4,
                }}>
                  {/* SPIN TAB */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("SPIN")}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: selectedTab === "SPIN" ? "rgba(255, 42, 95, 0.22)" : "transparent",
                      borderWidth: selectedTab === "SPIN" ? 1 : 0,
                      borderColor: selectedTab === "SPIN" ? "#ff2a5f" : "transparent",
                    }}
                  >
                    <Ionicons name="aperture-outline" size={15} color={selectedTab === "SPIN" ? "#ff2a5f" : "#94a3b8"} />
                    <Text style={{
                      fontSize: 12.5,
                      fontWeight: "800",
                      letterSpacing: 0.6,
                      color: selectedTab === "SPIN" ? "#ffffff" : "#94a3b8",
                    }}>
                      SPIN
                    </Text>
                  </TouchableOpacity>

                  {/* XO TAB */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("XO_GAME")}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: selectedTab === "XO_GAME" ? "rgba(0, 218, 243, 0.22)" : "transparent",
                      borderWidth: selectedTab === "XO_GAME" ? 1 : 0,
                      borderColor: selectedTab === "XO_GAME" ? "#00daf3" : "transparent",
                    }}
                  >
                    <Ionicons name="grid-outline" size={15} color={selectedTab === "XO_GAME" ? "#00daf3" : "#94a3b8"} />
                    <Text style={{
                      fontSize: 12.5,
                      fontWeight: "800",
                      letterSpacing: 0.6,
                      color: selectedTab === "XO_GAME" ? "#ffffff" : "#94a3b8",
                    }}>
                      XO
                    </Text>
                  </TouchableOpacity>

                  {/* COMING SOON TAB */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("COMING_SOON")}
                    style={{
                      flex: 1.25,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: selectedTab === "COMING_SOON" ? "rgba(148, 163, 184, 0.2)" : "transparent",
                      borderWidth: selectedTab === "COMING_SOON" ? 1 : 0,
                      borderColor: selectedTab === "COMING_SOON" ? "#94a3b8" : "transparent",
                    }}
                  >
                    <Ionicons name="help-circle-outline" size={15} color={selectedTab === "COMING_SOON" ? "#cbd5e1" : "#94a3b8"} />
                    <Text style={{
                      fontSize: 11.5,
                      fontWeight: "800",
                      letterSpacing: 0.5,
                      color: selectedTab === "COMING_SOON" ? "#ffffff" : "#94a3b8",
                    }}>
                      ? SOON
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Motion Carousel with Edge-to-Edge Container for Symmetrical Centering */}
                <View style={{ width: width, marginHorizontal: -14, overflow: "visible" }}>
                  {/* @ts-ignore */}
                  <Animated.ScrollView
                    ref={mobileCarouselRef as any}
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={cardInterval}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    disableIntervalMomentum={true}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      {
                        useNativeDriver: false,
                        listener: (e: any) => {
                          const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
                          const targetIdx = Math.max(0, Math.min(2, Math.round(offsetX / cardInterval)));
                          const newTab = targetIdx === 0 ? "SPIN" : targetIdx === 1 ? "XO_GAME" : "COMING_SOON";
                          if (scrollSyncTimeout.current) clearTimeout(scrollSyncTimeout.current);
                          scrollSyncTimeout.current = setTimeout(() => {
                            if (newTab !== selectedTab) {
                              try { playTickSound(); } catch {}
                              haptics.impact();
                              setSelectedTab(newTab);
                              setActiveGameMode(targetIdx === 0 ? "spin" : "xo");
                            }
                          }, 45);
                        }
                      }
                    )}
                    contentContainerStyle={{
                      paddingHorizontal: sideSpacer,
                      gap: cardGap,
                      paddingVertical: 6,
                      alignItems: "center",
                    }}
                    onScrollEndDrag={(e) => {
                      const offsetX = e.nativeEvent.contentOffset.x;
                      const targetIdx = Math.max(0, Math.min(2, Math.round(offsetX / cardInterval)));
                      const newTab = targetIdx === 0 ? "SPIN" : targetIdx === 1 ? "XO_GAME" : "COMING_SOON";
                      if (newTab !== selectedTab) {
                        try { playTickSound(); } catch {}
                        haptics.impact();
                        setSelectedTab(newTab);
                        setActiveGameMode(targetIdx === 0 ? "spin" : "xo");
                        router.setParams({ tab: newTab });
                      }
                    }}
                    onMomentumScrollEnd={(e) => {
                      const offsetX = e.nativeEvent.contentOffset.x;
                      const targetIdx = Math.max(0, Math.min(2, Math.round(offsetX / cardInterval)));
                      const newTab = targetIdx === 0 ? "SPIN" : targetIdx === 1 ? "XO_GAME" : "COMING_SOON";
                      if (newTab !== selectedTab) {
                        try { playTickSound(); } catch {}
                        haptics.impact();
                        setSelectedTab(newTab);
                        setActiveGameMode(targetIdx === 0 ? "spin" : "xo");
                        router.setParams({ tab: newTab });
                      }
                    }}>
                    {/* ── CARD 0: SPIN CARD (Red Neon Theme) ── */}
                    <Animated.View style={{ width: cardWidth, alignItems: "center", transform: [{ scale: spinCardScale }], opacity: spinCardOpacity }}>
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
                        {/* Background Artwork Image */}
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

                        {/* Artwork Image: spin-card bord.png */}
                        <View style={{ width: "100%", height: 245, alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
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
                            {isEN ? "Big prizes are waiting for you!" : "ትላልቅ ሽልማቶች ይጠብቁዎታል!"}
                          </Text>
                        </View>

                        {/* Inner Card Button: [ ▶ REAL SPIN ] */}
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            haptics.impact();
                            setSpinBetModalVisible(true);
                          }}
                          style={{
                            width: "100%",
                            height: 50,
                            borderRadius: 16,
                            overflow: "hidden",
                            shadowColor: "#ff2a5f",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.6,
                            shadowRadius: 14,
                            elevation: 8,
                          }}
                        >
                          <LinearGradient
                            colors={["#ff2a5f", "#d90429"]}
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
                            <Ionicons name="play" size={18} color="#ffffff" />
                            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
                              REAL SPIN
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
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" }} />
                          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                            REAL TIME
                          </Text>
                        </View>
                      </View>

                      {/* Outer Button: [ 4 Users + 1 Empty Slot | 5 Players Room > ] */}
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
                    </Animated.View>

                    {/* ── CARD 1: XO CARD (Cyan Neon Theme) ── */}
                    <Animated.View style={{ width: cardWidth, alignItems: "center", transform: [{ scale: xoCardScale }], opacity: xoCardOpacity }}>
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
                        {/* Background Artwork Image */}
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

                        {/* Artwork Image: xo-card bord.png */}
                        <View style={{ width: "100%", height: 245, alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
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
                          activeOpacity={0.85}
                          onPress={() => {
                            haptics.impact();
                            openRoomSheet();
                          }}
                          style={{
                            width: "100%",
                            height: 50,
                            borderRadius: 16,
                            overflow: "hidden",
                            shadowColor: "#00daf3",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.6,
                            shadowRadius: 14,
                            elevation: 8,
                          }}
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
                            <Ionicons name="play" size={18} color="#ffffff" />
                            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
                              PLAY NOW
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
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" }} />
                          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                            REAL TIME
                          </Text>
                        </View>
                      </View>

                      {/* Outer Button: [ 👥 PLAY WITH FRIEND > ] */}
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
                          backgroundColor: "rgba(18, 24, 44, 0.7)",
                          borderRadius: 20,
                          borderWidth: 1.2,
                          borderColor: "rgba(0, 218, 243, 0.25)",
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="people-outline" size={17} color="#00daf3" />
                          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 }}>
                            {isEN ? "PLAY WITH FRIEND" : "ከጓደኛ ጋር ይጫወቱ"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    </Animated.View>

                    {/* ── CARD 2: COMING SOON CARD (Slate Cyber Theme) ── */}
                    <Animated.View style={{ width: cardWidth, alignItems: "center", transform: [{ scale: soonCardScale }], opacity: soonCardOpacity }}>
                      <View
                        style={{
                          width: "100%",
                          backgroundColor: "#0d111c",
                          borderRadius: 26,
                          borderWidth: 1.5,
                          borderColor: "rgba(100, 116, 139, 0.5)",
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
                            <Ionicons name="help-circle" size={13} color="#94a3b8" />
                            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }}>
                              NEW ARENA
                            </Text>
                          </View>

                          <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
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

                        {/* Inner Card Button: [ 🔒 COMING SOON ] */}
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
                            COMING SOON
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
                    </Animated.View>
                  </Animated.ScrollView>
                </View>

                {/* Motion Carousel 3 Pill-Style Pagination Dots */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, marginBottom: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("SPIN")}
                    style={{ padding: 4 }}
                  >
                    <Animated.View
                      style={{
                        height: 7,
                        borderRadius: 4,
                        width: dot0Width,
                        backgroundColor: "#ff2a5f",
                        opacity: dot0Opacity,
                      }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("XO_GAME")}
                    style={{ padding: 4 }}
                  >
                    <Animated.View
                      style={{
                        height: 7,
                        borderRadius: 4,
                        width: dot1Width,
                        backgroundColor: "#00daf3",
                        opacity: dot1Opacity,
                      }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabPress("COMING_SOON")}
                    style={{ padding: 4 }}
                  >
                    <Animated.View
                      style={{
                        height: 7,
                        borderRadius: 4,
                        width: dot2Width,
                        backgroundColor: "#94a3b8",
                        opacity: dot2Opacity,
                      }}
                    />
                  </TouchableOpacity>
                </View>

                {/* Welcome Bonus Mini Card (10 ETB Giveaway) with Claimed/Unclaimed State */}
                <TouchableOpacity
                  activeOpacity={isBonusClaimed ? 1 : 0.85}
                  onPress={() => {
                    if (isBonusClaimed) return;
                    try {
                      playNotificationChime();
                      haptics.impact();
                    } catch {}
                    setWelcomeBonusModalVisible(true);
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: "#111625",
                    borderRadius: 20,
                    borderWidth: 1.2,
                    borderColor: isBonusClaimed ? "rgba(148, 163, 184, 0.25)" : "rgba(245, 182, 66, 0.4)",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    marginBottom: 14,
                    shadowColor: isBonusClaimed ? "transparent" : "#f5b642",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isBonusClaimed ? 0 : 0.15,
                    shadowRadius: 10,
                    elevation: 4,
                    opacity: isBonusClaimed ? 0.8 : 1,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: isBonusClaimed ? "rgba(148, 163, 184, 0.1)" : "rgba(245, 182, 66, 0.12)",
                      borderWidth: 1.2,
                      borderColor: isBonusClaimed ? "#94a3b8" : "#f5b642",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="gift" size={22} color={isBonusClaimed ? "#94a3b8" : "#f5b642"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 0.3 }}>
                          WELCOME BONUS
                        </Text>
                        <View style={{
                          backgroundColor: isBonusClaimed ? "rgba(148, 163, 184, 0.15)" : "rgba(245, 182, 66, 0.2)",
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 8,
                          borderWidth: 0.8,
                          borderColor: isBonusClaimed ? "rgba(148, 163, 184, 0.3)" : "rgba(245, 182, 66, 0.4)",
                        }}>
                          <Text style={{ color: isBonusClaimed ? "#94a3b8" : "#f5b642", fontSize: 10, fontWeight: "900" }}>
                            {isBonusClaimed ? "CLAIMED" : "10 ETB FREE"}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#8b93a7", fontSize: 11, fontWeight: "600", marginTop: 2 }}>
                        {isBonusClaimed
                          ? (isEN ? "You have received your welcome reward" : "የመጀመሪያ ቦነስዎን ወስደዋል")
                          : (isEN ? "Claim your free playable gift balance" : "የነጻ መጫወቻ 10 ብር ቦነስዎን ይውሰዱ")}
                      </Text>
                    </View>
                  </View>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: isBonusClaimed ? "rgba(148, 163, 184, 0.12)" : "rgba(245, 182, 66, 0.15)",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isBonusClaimed ? "rgba(148, 163, 184, 0.25)" : "rgba(245, 182, 66, 0.3)",
                  }}>
                    {isBonusClaimed ? (
                      <>
                        <Ionicons name="checkmark-circle" size={13} color="#94a3b8" />
                        <Text style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: "800" }}>
                          {isEN ? "CLAIMED" : "ተወስዷል"}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: "#f5b642", fontSize: 11.5, fontWeight: "800" }}>
                          {isEN ? "CLAIM" : "ውሰድ"}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color="#f5b642" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* ── TOP 3 WEEKLY LEADERBOARD SHOWCASE (Redesigned per Image 1 & 4) ── */}
                <View style={{ width: "100%", marginTop: 22, marginBottom: 16 }}>
                  {/* Title Bar (Emoji removed, clean Space Grotesk / Inter styling) */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: 12,
                    paddingHorizontal: 4,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: "#00BFFF" }} />
                      <Text style={{
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: "900",
                        letterSpacing: 0.8,
                        fontFamily: "Space Grotesk, Inter, sans-serif"
                      }}>
                        {isEN ? "WEEKLY LEADERBOARD" : "የሳምንቱ አሸናፊዎች"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        try { playTickSound(); } catch {}
                        haptics.tap();
                        router.push("/(authed)/home/leaderboard" as any);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <Text style={{ color: "#00BFFF", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4 }}>
                        {isEN ? "VIEW ALL" : "ሁሉንም እይ"}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#00BFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Horizontal Scrollable Pill Capsules (Restrained Slate palette, Bold Rank Numbers) */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingHorizontal: 2 }}
                  >
                    {champions.map((champ) => {
                      const rankColor = champ.rank === 1 ? "#F5B642" : champ.rank === 2 ? "#00BFFF" : "#FF1744";
                      const rankOrdinal = champ.rank === 1 ? "1st" : champ.rank === 2 ? "2nd" : "3rd";
                      return (
                        <TouchableOpacity
                          key={champ.rank}
                          activeOpacity={0.8}
                          onPress={() => {
                            try { playTickSound(); } catch {}
                            haptics.tap();
                            router.push("/(authed)/home/leaderboard" as any);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            backgroundColor: "#111827",
                            borderRadius: 20,
                            borderWidth: 1.2,
                            borderColor: "#233041",
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            paddingRight: 16,
                          }}
                        >
                          {/* Rank Number Circle Badge (Replacing avatar) */}
                          <View style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            borderWidth: 1.2,
                            borderColor: "#233041",
                            backgroundColor: "#080F17",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <Text style={{
                              color: rankColor,
                              fontSize: 16,
                              fontWeight: "900",
                              fontFamily: "Space Grotesk, Inter, sans-serif",
                            }}>
                              #{champ.rank}
                            </Text>
                          </View>

                          {/* Name & Prize */}
                          <View>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: "#ffffff",
                                fontSize: 13,
                                fontWeight: "800",
                                maxWidth: 115,
                              }}
                            >
                              {champ.username}
                            </Text>
                            <Text style={{ color: "#8893A7", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                              <Text style={{ color: rankColor, fontWeight: "800" }}>{rankOrdinal}</Text> • {champ.prize} ETB
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            );
          })()}

          <View style={{ height: 8 }} />
        </ScrollView>

        {!!user?.username && <WelcomeTermsPopup visible={termsVisible} onAgree={handleAgreeTerms} language={language} />}
        <ProfileEditModal
          visible={!user?.username && !booting}
          onClose={() => {}}
          initialUsername={user?.username}
          initialDisplayName={(user as any)?.display_name}
          initialAvatar={(user as any)?.avatar}
          onSaved={refreshProfile}
          language={language}
        />
        <WelcomeBonusModal visible={welcomeBonusModalVisible} onClose={() => setWelcomeBonusModalVisible(false)} />
        <BonusLogsModal visible={bonusModalVisible} onClose={() => setBonusModalVisible(false)} language={language} />
        <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} language={language} />

        {/* Mobile Rail Spin Stake Selector Modal */}
        <Modal visible={showMobileStakeModal} transparent animationType="slide">
          <View style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(6, 9, 22, 0.75)"
          }}>
            <View style={{
              backgroundColor: "#0d0e1a",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: "#1e2340",
              padding: 24,
              paddingBottom: Platform.OS === "ios" ? 40 : 24,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
                  {isEN ? "CHOOSE YOUR WAGER" : "የእንጨት መጠን ይምረጡ"}
                </Text>
                <TouchableOpacity onPress={() => setShowMobileStakeModal(false)}>
                  <Ionicons name="close" size={24} color="#8b93a7" />
                </TouchableOpacity>
              </View>

              {spinError && (
                <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 12 }}>
                  {spinError}
                </Text>
              )}

              {/* Current Balance */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ color: "#8b93a7", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" }}>
                  {isEN ? "AVAILABLE BALANCE:" : "ያለዎት ቀሪ ሂሳብ:"}
                </Text>
                <Text style={{ color: "#22d3ee", fontSize: 13, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                  ETB {balance.toLocaleString()}
                </Text>
              </View>

              {/* Stepper +/- */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#141829",
                borderRadius: 12,
                padding: 4,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#1e2340"
              }}>
                <TouchableOpacity
                  onPress={() => setMobileStakeInput(prev => String(Math.max(10, Number(prev) - 10)))}
                  style={{ width: 44, height: 44, backgroundColor: "#1e2340", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>{mobileStakeInput} ETB</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setMobileStakeInput(prev => String(Number(prev) + 10))}
                  style={{ width: 44, height: 44, backgroundColor: "#1e2340", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Presets */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {[10, 50, 100, 500].map(val => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setMobileStakeInput(String(val))}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      backgroundColor: "#141829",
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: mobileStakeInput === String(val) ? "#22d3ee" : "#1e2340",
                      alignItems: "center"
                    }}
                  >
                    <Text style={{ color: mobileStakeInput === String(val) ? "#22d3ee" : "#8b93a7", fontSize: 12, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Confirm button */}
              <TouchableOpacity
                onPress={() => handleConfirmMobileRailSpin(Number(mobileStakeInput))}
                style={{
                  backgroundColor: "#22d3ee",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: "#0d0e1a", fontSize: 14, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
                  {isEN ? "CONFIRM & JOIN" : "አረጋግጥ እና ጀምር"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {Platform.OS === 'web' && (
          <>
            <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
            <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} language={language} />
          </>
        )}
      </SafeAreaView>
      {exitModalVisible && <ExitModal language={language} onCancel={cancelExit} onConfirm={confirmExit} />}

      <FriendMatchModal
        visible={friendModalVisible}
        onClose={() => { setFriendModalVisible(false); setInviteResult(null); }}
        onSendInvite={handleSendInvite}
        inviteResult={inviteResult}
      />
      <IncomingInviteModal
        invite={incomingInvite}
        onAccept={() => handleInviteResponse(true)}
        onDecline={() => handleInviteResponse(false)}
      />
      {/* Global Rematch Popup — shows even when winner left game room */}
      <RematchTopPopup
        visible={!!globalRematchOffer?.visible}
        fromName={globalRematchOffer?.fromName}
        amount={globalRematchOffer?.amount}
        onAccept={handleGlobalRematchAccept}
        onDecline={handleGlobalRematchDecline}
      />

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
          isDesktop={false}
          userCaps={{ r1_10_wins: (user as any)?.r1_10_wins, r1_15_wins: (user as any)?.r1_15_wins, r1_25_wins: (user as any)?.r1_25_wins, r1_50_wins: (user as any)?.r1_50_wins, r1_99_wins: (user as any)?.r1_99_wins, rooms_locked: appConfig.rooms_locked }}
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

      {/* Notifications Popover */}
      <NotificationsPopover
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onUnreadCountChange={setUnreadCount}
      />

      {/* Live Wins Real-time Ticker (Mobile) */}
      {!isLargeScreen && currentWinAnnouncement && (
        <WinTicker currentWinAnnouncement={currentWinAnnouncement} winTickerAnim={winTickerAnim} />
      )}

      <PromotionPopup config={promoConfig} visible={showPromo} onClose={() => setShowPromo(false)} />

      {/* PWA Install Instructions Modal */}
      <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />
    </View>
  );
}



const styles = StyleSheet.create({
  // base
  bg: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingBottom: 18 },

  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050816" },
  bootText: { color: "rgba(255,255,255,0.8)", marginTop: 10, fontWeight: "700" },

  // blobs
  blob: {
    position: "absolute",
    width: 450,
    height: 450,
    borderRadius: 225,
    opacity: 0.12,
    ...Platform.select({
      web: {
        filter: "blur(80px)",
      } as any,
    }),
  },
  blob1: {
    top: "5%",
    left: "-20%",
    backgroundColor: "#ff4766", // Glowing Coral Red
  },
  blob2: {
    bottom: "15%",
    right: "-30%",
    backgroundColor: "#00daf3", // Glowing Cyan
  },
  blob3: {
    top: "45%",
    left: "15%",
    backgroundColor: "#1b1a24", // Glowing Stealth Grey
    opacity: 0.08,
    width: 500,
    height: 500,
    borderRadius: 250,
  },

  // floating dots
  floatingLayer: { ...StyleSheet.absoluteFillObject },
  floatDot: {
    position: "absolute",
    backgroundColor: "#ffffff",
  },

  // header
  header: { marginTop: 6 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  brandIconInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: "rgba(255,255,255,0.96)", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  brandSub: { marginTop: 2, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },

  headerBtns: { flexDirection: "row", gap: 8 },
  pillOuter: { borderRadius: 14, overflow: "hidden" },
  pillInner: { height: 38, paddingHorizontal: 12, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  balanceCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a", // sleek NextUI border
    backgroundColor: "rgba(24,24,27,0.7)", // dark slate surface base
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "800" },
  balanceValue: { marginTop: 4, color: "rgba(255,255,255,0.98)", fontSize: 22, fontWeight: "900" },

  refreshInner: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  refreshText: { color: "rgba(255,255,255,0.92)", fontWeight: "900", fontSize: 12 },

  balanceLeft: { flex: 1 },
  refreshBtn: { borderRadius: 16, overflow: "hidden" },
  quickScroll: { paddingVertical: 12, paddingHorizontal: 4, gap: 10 },
  quickGrid: { flexDirection: 'row', gap: 10 },

  // Quick Tile
  tile: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a', backgroundColor: 'rgba(24,24,27,0.5)' },
  tileIcon: { padding: 12, alignItems: 'flex-start' },
  tileIconInner: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileTextWrap: { paddingHorizontal: 12, paddingBottom: 14 },
  tileTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  tileSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Mobile Main Card Styles
  mainCard: {
    marginTop: 12,
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#18181b",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  logo: { width: "100%", height: "100%" },
  heroTitle: { color: "rgba(255,255,255,0.96)", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  heroSub: { marginTop: 4, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600", lineHeight: 16 },
  boardWrap: {
    marginTop: 14,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: 'center',
    justifyContent: 'center'
  },
  board: { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" },
  boardRow: { flexDirection: "row" },
  cell: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  oText: { color: "#22D3EE" },
  xText: { color: "#FB7185" },

  playBtn: { marginTop: 14, borderRadius: 18, overflow: "hidden" },
  playInner: { paddingVertical: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  playText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.2 },
  infoRow: { marginTop: 12, flexDirection: "row", flexWrap: "nowrap", gap: 6 },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  infoText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    minWidth: 0,
  },

  // Modern Desktop Grid Layout
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexShrink: 1,
  },
  desktopColLeft: {
    width: 280,
    gap: 16,
  },
  desktopColCenter: {
    flex: 1,
    minWidth: 0,
  },
  desktopColRight: {
    width: 260,
    gap: 12,
  },

  // Welcome Card
  desktopWelcomeCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  desktopWelcomeGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(167,139,250,0.06)',
  },
  desktopWelcomeContent: { marginBottom: 16 },
  desktopWelcomeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  desktopWelcomeSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  desktopBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.1)',
  },
  desktopBalanceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Stats Row
  desktopStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  desktopStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  desktopStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  desktopStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bonusBadgeWeb: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bonusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bonusBadgeText: {
    color: '#0B0B0F',
    fontSize: 11,
    fontWeight: '900',
  },

  // Activity Card
  desktopActivityCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  desktopActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopActivityText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopActivityTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Arena
  desktopArena: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  desktopArenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
  },
  desktopArenaTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  desktopArenaSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  desktopArenaLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  desktopLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  desktopLiveText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  desktopBoardWrap: {
    marginHorizontal: 28,
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  desktopPlayBtn: {
    marginTop: 20,
    marginHorizontal: 28,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  desktopPlayBtnInner: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  desktopPlayBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  desktopOnlineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    paddingBottom: 24,
  },
  desktopOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  desktopOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  desktopOnlineText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },

  // Room Cards (Desktop)
  desktopRoomCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  desktopRoomInner: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktopRoomInfo: { flex: 1 },
  desktopRoomTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  desktopRoomMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  desktopRoomBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  desktopRoomBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  desktopRoomBadgeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Quick Deposit
  desktopQuickDeposit: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  desktopQuickDepositInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.1)',
  },
  desktopQuickDepositText: {
    flex: 1,
    color: '#00daf3',
    fontSize: 13,
    fontWeight: '800',
  },

  desktopSectionTitle: {
    color: 'rgba(167,139,250,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  searchOrbWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00daf3',
  },
  searchRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRing: {
    padding: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
    position: 'absolute',
  },
  searchScanner: {
    position: 'absolute',
    width: 300,
    height: 300,
  },
  searchLine: {
    position: 'absolute',
    top: 0,
    left: 150,
    width: 2,
    height: 150,
    backgroundColor: 'rgba(166,139,255,0.4)',
  },
  searchDot: {
    position: 'absolute',
    top: -4,
    left: 147,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  searchAvatarWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#00daf3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#00daf3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  searchBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  searchStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 48,
    width: '100%',
    paddingHorizontal: 20,
  },
  searchStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchStatLabel: {
    color: 'rgba(229,227,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchCancelBtn: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(253,111,133,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253,111,133,0.2)',
  },
  searchCancelText: {
    color: '#fd6f85',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  searchQuickNote: {
    marginTop: 40,
    backgroundColor: 'rgba(166,139,255,0.05)',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(166,139,255,0.1)',
  },
  searchNoteIcon: {
    marginTop: 2,
  },
  searchNoteText: {
    flex: 1,
    color: 'rgba(229,227,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
  },
  txRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  txText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 13,
  },

  // Neon Abyss Layout
  boardBgGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,12,31,0.5)',
    borderRadius: 40,
  },
  neonHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  neonTitle: {
    color: '#e5e3ff',
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 28,
  },

  neonSubTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  boardContainer: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: 'rgba(4,4,12,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 40,
  },
  neonBoard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonBoardRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonCell: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 54,
    fontWeight: '900',
  },
  neonOText: {
    color: '#00f0ff',
    textShadowColor: 'rgba(0, 240, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  neonXText: {
    color: '#ff2d55',
    textShadowColor: 'rgba(255, 45, 85, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  neonCtaOuter: {
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  neonCtaInner: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // modal / sheet
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  exitSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    paddingBottom: 18,
  },
  exitHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  exitIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exitTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  exitSub: { marginTop: 2, color: "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: "600" },

  exitActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  exitGhost: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  exitGhostText: { color: "rgba(255,255,255,0.88)", fontWeight: "900" },
  exitDanger: { flex: 1, borderRadius: 16, overflow: "hidden" },
  exitDangerInner: { paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  exitDangerText: { color: "#fff", fontWeight: "900" },

  // Sheets & Modals
  sheetBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(10,12,24,0.6)",
    zIndex: -1,
  },
  desktopModal: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#18181b',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 20,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    zIndex: 10001,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#18181b",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    minHeight: 420,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 24,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    zIndex: 10001,
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  sheetHeader: {
    paddingHorizontal: 28,
    marginTop: 24,
    marginBottom: 28,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.4
  },
  sheetSubTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "600"
  },
  sheetContent: {
    paddingBottom: 100
  },

  roomList: {
    paddingHorizontal: 24,
    gap: 12
  },
  roomBtn: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  roomInner: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  roomName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3
  },
  roomDetail: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 3,
    fontWeight: "700"
  },
  roomAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  viewText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },

  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fairPlayBanner: {
    marginTop: 24,
    backgroundColor: "rgba(129,140,248,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.15)",
  },
  fairPlayText: {
    flex: 1,
    color: "rgba(129,140,248,0.8)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },

  amountBox: {
    width: "47%",
    aspectRatio: 1.4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  amountBoxSelected: {
    backgroundColor: "rgba(166,139,255,0.12)",
    borderColor: "rgba(166,139,255,0.5)",
  },
  amountBoxContent: {
    alignItems: 'center',
    gap: 6,
  },
  amountVal: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  amountCommission: {
    color: "rgba(255,255,255,0.3)",
    fontWeight: "800",
    fontSize: 10,
    textTransform: 'uppercase',
  },
  capNote: {
    color: '#fd6f85',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },

  confirmBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  balanceNote: {
    marginTop: 16,
    alignItems: 'center',
  },
  balanceNoteText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
  },

// ─── Desktop Hub Styles ───
  desktopHubRoot: { flex: 1, backgroundColor: 'transparent' },
  hubDesktopGrid: { flexDirection: 'row', gap: 24, maxWidth: 1240, alignSelf: 'center', width: '100%', paddingHorizontal: 24, marginTop: 24 },
  desktopMainCol: { flex: 8, gap: 16 },
  desktopSideCol: { flex: 4, gap: 16 },

  // Glass Panel
  glassCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.75)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.6)',
    padding: 40,
    overflow: 'hidden',
  },

  // Gameplay Hub Specifics
  hubTitle: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 10, textAlign: 'center' },
  hubSub: { color: 'rgba(229, 227, 255, 0.5)', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 44 },

  hubBoardContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  playNowBtn: { marginTop: 24, borderRadius: 22, overflow: 'hidden', shadowColor: '#00daf3', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 28, alignSelf: 'center', width: 280 },
  playNowInner: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  playNowText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },

  // Bento Stats
  statsBento: { flexDirection: 'row', gap: 24 },
  bentoCard: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderRadius: 28, padding: 28, flexDirection: 'row', alignItems: 'center', gap: 24, borderWidth: 1, borderColor: '#27272a' },
  bentoIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bentoLabel: { color: 'rgba(0, 218, 243, 0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  bentoValue: { color: '#fff', fontSize: 28, fontWeight: '900' },

  // Account Card
  accountCard: { padding: 32 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  accountTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  accountLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountValue: { color: '#fff', fontWeight: '800', fontSize: 15 },
  verifiedPill: { backgroundColor: 'rgba(0,218,243,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,218,243,0.3)' },
  verifiedText: { color: '#00daf3', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },

  // Quick Actions
  actionGrid: { flexDirection: 'row', gap: 14, marginTop: 12 },
  actionBtn: { flex: 1, height: 90, borderRadius: 22, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderWidth: 1, borderColor: '#27272a', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick Stats
  quickStats: { marginTop: 36, paddingTop: 36, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  quickStatsTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 18 },
  quickStatsRow: { flexDirection: 'row', gap: 36 },
  quickStatItem: { flex: 1 },
  quickStatVal: { color: '#fff', fontSize: 30, fontWeight: '900' },
  quickStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginTop: 6 },

  // Transactions
  txPanel: { padding: 32 },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  txList: { gap: 18 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(24, 24, 27, 0.4)', padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txMain: { flex: 1 },
  txLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
  txTime: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 3 },
  txAmount: { fontSize: 16, fontWeight: '900' },

  // Bonus Logs UI
  bonusPillInline: { marginLeft: 8, borderRadius: 8, overflow: 'hidden' },
  bonusPillGradient: { paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  bonusPillText: { color: '#0B0B0F', fontSize: 11, fontWeight: '900' },
  bonusSheet: {
    backgroundColor: '#121226',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bonusSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  bonusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  bonusIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bonusSheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bonusSheetSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bonusCloseBtn: { padding: 8 },
  bonusList: { flex: 1 },
  emptyBonus: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBonusText: { color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: '700', fontSize: 13 },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  bonusItemLeft: { flex: 1 },
  bonusItemReason: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bonusItemDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, fontWeight: '600' },
  bonusItemAmount: { color: '#00daf3', fontSize: 15, fontWeight: '900' },
  bonusDoneBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  bonusDoneInner: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  bonusDoneText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5 },

  // Promo Code
  promoInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,24,27,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingLeft: 16,
    paddingRight: 6,
    height: 54,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  promoBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoHint: {
    color: 'rgba(0,218,243,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
});

// SPIN card styles (token-based)
const spinStyles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#10101F",
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    alignSelf: "stretch",
  },
  title: {
    color: "#EDEEF4",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: "#F5B642",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.28)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  liveText: {
    color: "#B4B8CC",
    fontSize: 11.5,
    fontWeight: "700",
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  capsule: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  capsuleText: {
    color: "#EDEEF4",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});

// Removed local BonusLogsModal, using imported version.

async function sendGeezSMS({ userId, phone, message }: { userId: string; phone: string; message: string }) {
  // logic here
}
