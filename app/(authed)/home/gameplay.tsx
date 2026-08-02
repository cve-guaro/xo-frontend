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
import { useAudioPlayer } from "expo-audio";
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
import MobileQuickTile from "../../../components/game/MobileQuickTile";
import DesktopLayout from "../../../components/game/DesktopLayout";
import WinTicker from "../../../components/game/WinTicker";
import FloatingActions from "../../../components/game/FloatingActions";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { LobbyHeader } from "../../../components/game/LobbyHeader";
import { WeeklyPodium } from "../../../components/game/WeeklyPodium";
import { SocialProofCard } from "../../../components/game/SocialProofCard";
import { LiveWinToast } from "../../../components/game/LiveWinToast";






// Session tracker for promotion popup to prevent showing it on web page tab transitions
let hasShownPromoThisSession = false;

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // Infinite slow rotation animation for home screen wheels
  const idleSpinAnim = useRef(new Animated.Value(0)).current;
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
  const { user, token, booting, refreshProfile, language, switchLanguage, t, showAlert, fixUrl } = useAuth();
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
  const [selectedTab, setSelectedTab] = useState<"SPIN" | "XO_GAME">("SPIN");
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

  const params = useLocalSearchParams();

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
  const clickSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));

  const playClick = useCallback(async () => {
    if (!bgMusicPlaying) return;
    try {
      clickSound.play();
    } catch { }
  }, [bgMusicPlaying, clickSound]);

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
      await refreshProfile();
      toast.success(isEN ? "Balance Updated" : "ሂሳብዎ ታድሷል", undefined, 1500);
    } catch (e) {
      toast.error(isEN ? "Refresh Failed" : "ማደስ አልተቻለም", isEN ? "Could not update your balance." : "የመለያ ሂሳብዎን ማደስ አልተቻለም።");
      console.log("Error refreshing profile:", e);
    }
  }, [playClick, refreshProfile]);

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
  const [sheetStep, setSheetStep] = useState<SheetStep>("ROOMS");
  const [selectedRoomId, setSelectedRoomId] = useState<RoomConfig["id"]>("R1");

  const selectedRoom = useMemo(() => ROOMS.find((r) => r.id === selectedRoomId) || ROOMS[0], [selectedRoomId]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(520)).current;

  const openRoomSheet = useCallback(async () => {
    haptics.tap();
    await playClick();
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
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

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
          />

          {/* 2. Quick Action Cards (Deposit, Withdraw, Transactions) */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <MobileQuickTile
              icon="arrow-down"
              iconColor="#60a5fa"
              title={isEN ? "Deposit" : "ማስገቢያ"}
              subtitle="TOP UP"
              onPress={() => Platform.OS === 'web' ? setDepositVisible(true) : router.push("/(authed)/deposit")}
            />
            <MobileQuickTile
              icon="arrow-up"
              iconColor="#eab308"
              title={isEN ? "Withdraw" : "ወጪ ማውጫ"}
              subtitle="CASH OUT"
              onPress={() => Platform.OS === 'web' ? setWithdrawVisible(true) : router.push("/(authed)/withdraw")}
            />
            <MobileQuickTile
              icon="swap-horizontal"
              iconColor="#00daf3"
              title={isEN ? "Transactions" : "ግብይቶች"}
              subtitle="HISTORY"
              onPress={() => router.push("/(authed)/home/transactions")}
            />
          </View>

          {/* 3. Mode Switcher Tabs (SPIN vs XO) */}
          <View style={{
            flexDirection: "row",
            backgroundColor: "#0d0e1d",
            borderRadius: 16,
            padding: 4,
            marginTop: 16,
            borderWidth: 1.2,
            borderColor: "rgba(139, 92, 246, 0.2)",
            alignSelf: "center",
            width: "100%",
          }}>
            <TouchableOpacity
              onPress={() => setSelectedTab("SPIN")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: selectedTab === "SPIN" ? "rgba(139, 92, 246, 0.25)" : "transparent",
                borderColor: selectedTab === "SPIN" ? "#8b5cf6" : "transparent",
                borderWidth: selectedTab === "SPIN" ? 1.2 : 0,
                gap: 8,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: selectedTab === "SPIN" ? "#c084fc" : "#8b93a7", fontSize: 13, fontWeight: "900" }}>
                ⚡ SPIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedTab("XO_GAME")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: selectedTab === "XO_GAME" ? "rgba(139, 92, 246, 0.25)" : "transparent",
                borderColor: selectedTab === "XO_GAME" ? "#8b5cf6" : "transparent",
                borderWidth: selectedTab === "XO_GAME" ? 1.2 : 0,
                gap: 8,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: selectedTab === "XO_GAME" ? "#c084fc" : "#8b93a7", fontSize: 13, fontWeight: "900" }}>
                ❖ XO
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Main Gaming Section (SPIN TO WIN vs XO Podium) */}
          {selectedTab === "SPIN" ? (
            <ImageBackground
              source={require("../../../assets/images/spin-bg.jpg")}
              style={{
                marginTop: 16,
                borderRadius: 24,
                padding: 18,
                alignItems: "center",
                width: "100%",
                overflow: "hidden",
                borderWidth: 1.5,
                borderColor: "rgba(139, 92, 246, 0.3)",
                position: "relative",
              }}
              imageStyle={{ borderRadius: 24, opacity: 0.8 }}
              resizeMode="cover"
            >
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(12, 9, 30, 0.72)", borderRadius: 24 }]} />

              {/* SPIN TO WIN Header Row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: 16 }}>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 }}>
                    SPIN TO WIN
                  </Text>
                  <Text style={{ color: "#f5b642", fontSize: 14, fontWeight: "700", fontStyle: "italic", marginTop: 1 }}>
                    Big rewards
                  </Text>
                </View>

                {/* 5 Players Pill Badge */}
                <View style={{ backgroundColor: "rgba(139, 92, 246, 0.15)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(139, 92, 246, 0.3)", alignItems: "flex-end" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="people" size={12} color="#c084fc" />
                    <Text style={{ color: "#c084fc", fontSize: 11, fontWeight: "900" }}>
                      5 Players
                    </Text>
                  </View>
                  <Text style={{ color: "#8b93a7", fontSize: 9.5, fontWeight: "700", marginTop: 2 }}>
                    5 People Spin
                  </Text>
                </View>
              </View>

              {/* Centered Golden Prize Wheel */}
              <View style={{ width: 260, height: 260, position: "relative", alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
                <Animated.View style={{ transform: [{ rotate: idleSpinRotate }], width: 260, height: 260 }}>
                  <SpinWheelSvg size={260} mode={spinMode} hidePointer={true} />
                </Animated.View>

                {/* Golden Arrow Pointer at top center (12 o'clock) */}
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
                  <Svg width={260} height={260} viewBox="0 0 260 260">
                    <G transform={`rotate(180, 130, ${130 - 104 * 1.02})`}>
                      <Path
                        d={`M 130 ${130 - 104 * 1.02} L ${130 - 12} ${130 - 104 * 1.16} L ${130 + 12} ${130 - 104 * 1.16} Z`}
                        fill="#f5b642"
                        stroke="#c59b27"
                        strokeWidth={1.5}
                      />
                    </G>
                  </Svg>
                </View>
              </View>

              {/* SPIN NOW! Big Neon CTA Button */}
              <TouchableOpacity
                onPress={handleMobileSpinNow}
                style={{
                  marginTop: 20,
                  width: "100%",
                  borderRadius: 24,
                  overflow: "hidden",
                  borderWidth: 1.5,
                  borderColor: "#f5b642",
                  shadowColor: "#a855f7",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                  elevation: 8,
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#8b35ff", "#c026d3", "#7c3aed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "900" }}>««</Text>
                  <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900", letterSpacing: 1.5 }}>
                    SPIN NOW!
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "900" }}>»»</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* 5 People Spin Capsule Button */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => {
                    haptics.tap();
                    router.push({
                      pathname: '/(authed)/home/spin',
                      params: { mode: "5_PLAYER" }
                    } as any);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 20,
                    borderWidth: 1.2,
                    borderColor: "rgba(139, 92, 246, 0.4)",
                    backgroundColor: "rgba(18, 14, 42, 0.8)",
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row" }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff" }}>
                      <Text style={{ fontSize: 9 }}>👤</Text>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff", marginLeft: -8 }}>
                      <Text style={{ fontSize: 9 }}>👤</Text>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#22d3ee", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff", marginLeft: -8 }}>
                      <Text style={{ fontSize: 9 }}>👤</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 }}>
                    5 PEOPLE SPIN ›
                  </Text>
                </TouchableOpacity>

                {/* Floating Plus Button */}
                <TouchableOpacity
                  onPress={openRoomSheet}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "#8b5cf6",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#8b5cf6",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          ) : (
            <WeeklyPodium
              isEN={isEN}
              weeklyLeaderboard={weeklyLeaderboard}
              myWeeklyRank={myWeeklyRank}
              isBanned={isBanned}
              openRoomSheet={openRoomSheet}
              setFriendModalVisible={setFriendModalVisible}
              setRulesVisible={setRulesVisible}
              t={t}
            />
          )}

          {/* 5. Social Proof Statistics Card */}
          <SocialProofCard
            winnersCount={24}
            totalWinningsFormatted="ETB 156,780"
            winRate={winRate || 68}
            isEN={isEN}
          />

          {/* 6. Live Activity Toast */}
          <LiveWinToast message={currentWinAnnouncement || "Abel won ETB 2,500 • 2s ago"} />

          <View style={{ height: 35 }} />
        </ScrollView>

        {/* 7. Mobile Sticky Bottom Navigation Bar (Fintech Luxury Bar) */}
        <View style={{
          flexDirection: "row",
          backgroundColor: "#0a0b18",
          borderTopWidth: 1.2,
          borderTopColor: "rgba(139, 92, 246, 0.2)",
          paddingVertical: 10,
          paddingBottom: Platform.OS === "ios" ? 22 : 12,
          alignItems: "center",
          justifyContent: "space-around",
          width: "100%",
        }}>
          {/* HOME Tab (Active) */}
          <TouchableOpacity
            style={{
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: "rgba(139, 92, 246, 0.18)",
              borderWidth: 1,
              borderColor: "rgba(139, 92, 246, 0.4)",
            }}
            onPress={() => router.push('/(authed)/home/gameplay')}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color="#c084fc" />
            <Text style={{ color: "#c084fc", fontSize: 10, fontWeight: "900", marginTop: 2 }}>
              {isEN ? "HOME" : "መነሻ"}
            </Text>
          </TouchableOpacity>

          {/* HISTORY Tab */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => router.push('/(authed)/home/history')}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={20} color="#8b93a7" />
            <Text style={{ color: "#8b93a7", fontSize: 10, fontWeight: "800", marginTop: 2 }}>
              {isEN ? "HISTORY" : "ታሪክ"}
            </Text>
          </TouchableOpacity>

          {/* LEADERBOARD Tab */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => router.push('/(authed)/home/leaderboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy-outline" size={20} color="#8b93a7" />
            <Text style={{ color: "#8b93a7", fontSize: 10, fontWeight: "800", marginTop: 2 }}>
              {isEN ? "LEADERBOARD" : "ደረጃዎች"}
            </Text>
          </TouchableOpacity>

          {/* PROFILE Tab */}
          <TouchableOpacity
            style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => router.push('/(authed)/home/account')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={20} color="#8b93a7" />
            <Text style={{ color: "#8b93a7", fontSize: 10, fontWeight: "800", marginTop: 2 }}>
              {isEN ? "PROFILE" : "መገለጫ"}
            </Text>
          </TouchableOpacity>
        </View>
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
        />
      )}

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

      {/* Collapsible Floating Action Toolbar (Mobile) */}
      {!isLargeScreen && (
        <FloatingActions
          floatingExpanded={floatingExpanded}
          floatingAnim={floatingAnim}
          bgMusicPlaying={bgMusicPlaying}
          onToggleSound={handleToggleSound}
          onBonusLogs={() => setBonusModalVisible(true)}
          onExpand={() => setFloatingExpanded(true)}
          onCollapse={() => setFloatingExpanded(false)}
        />
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

// Removed local BonusLogsModal, using imported version.

async function sendGeezSMS({ userId, phone, message }: { userId: string; phone: string; message: string }) {
  // logic here
}
