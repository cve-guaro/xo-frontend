// app/(authed)/home/spin.tsx
// ────────────────────────────────────────────────────────────────────────────
// Full-page Spin game screen with desktop layout integration.
// Shows room browser → waiting room → live spin → result.
// Connects to backend via socket for all real-time state.
// ────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  ImageBackground,
  useWindowDimensions,
  Modal,
  Pressable,
  Animated,
  Easing,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Ellipse, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL, AGORA_APP_ID } from "../../../config";
import SpinWheel, { SPIN_PALETTE, getPlayerPalette } from "../../../components/game/SpinWheel";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import InviteFriendsModal from "../../../components/game/InviteFriendsModal";
import IncomingSpinInviteModal, { SpinInvitePayload } from "../../../components/game/IncomingSpinInviteModal";
import { voiceService } from "../../../lib/voiceService";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import {
  playWinSound,
  playLossSound,
  playLockoutSound,
  playCountdownBeep,
  playWhooshSound,
  playCoinSound,
  playTickSound,
  playWinFanfare,
  playLoseSound,
  playAddStakeSound,
  playPopupSound,
  stopSpinSoundLoop,
} from "../../../lib/pinTickAudio";

const wonBoardCardImg = require("../../../assets/images/won bord card.png");
const lostBoardCardImg = require("../../../assets/images/lost bord card.png");
const spinBgRedDesktopImg = require("../../../assets/images/spin-background-red-desktop.png");

type BetReaction = {
  id: string;
  x: number;
  y: number;
  playerName: string;
  amount: number;
  pal: typeof SPIN_PALETTE[0];
};

function FloatingBetReactionBadge({ reaction }: { reaction: BetReaction }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1250,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [10, -6, -28, -44],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.7, 1.1, 1, 0.9],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: reaction.x,
        top: reaction.y,
        zIndex: 40,
        opacity,
        transform: [{ translateX: -40 }, { translateY }, { scale }],
        borderRadius: 9999,
        borderWidth: 2,
        borderColor: "#ffffff",
        backgroundColor: reaction.pal.light,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.85,
        shadowRadius: 10,
      }}
    >
      <View style={{ backgroundColor: "rgba(255, 255, 255, 0.9)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 9999 }}>
        <Text style={{ color: "#03060f", fontSize: 10, fontWeight: "900" }}>{reaction.playerName}</Text>
      </View>
      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
        +{reaction.amount} ETB
      </Text>
    </Animated.View>
  );
}

// ── Coin Stack Icon Component ─────────────────────────────────────────────
function CoinStackIcon({ size = 16, color = "#facc15" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="6" rx="8" ry="3" fill={color} stroke="#b45309" strokeWidth="1" />
      <Path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill={color} stroke="#b45309" strokeWidth="1" />
      <Ellipse cx="12" cy="11" rx="8" ry="2.5" fill="#eab308" />
      <Path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" fill={color} stroke="#b45309" strokeWidth="1" />
      <Ellipse cx="12" cy="16" rx="8" ry="2.5" fill="#ca8a04" />
    </Svg>
  );
}

// ── 3D Crown Icon Component (Image 4) ──────────────────────────────────────
function CrownIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffff">
      <Path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </Svg>
  );
}



// ── Animated Voice Equalizer Wave ─────────────────────────────────────────
function SpeakingWaveAnimation() {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(8)).current;
  const bar4 = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, min: number, max: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
        ])
      );
    };

    const anim1 = createLoop(bar1, 4, 18, 250);
    const anim2 = createLoop(bar2, 3, 16, 320);
    const anim3 = createLoop(bar3, 5, 20, 280);
    const anim4 = createLoop(bar4, 4, 14, 350);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
    };
  }, [bar1, bar2, bar3, bar4]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 18, gap: 2, marginLeft: 6 }}>
      <Animated.View style={{ width: 3, height: bar1, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar2, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar3, backgroundColor: "#22c55e", borderRadius: 2 }} />
      <Animated.View style={{ width: 3, height: bar4, backgroundColor: "#22c55e", borderRadius: 2 }} />
    </View>
  );
}

// ── Animated User Mic Button with Pulsing Green Wave (when speaking/unmuted) ──
function AnimatedUserMicButton({
  isSelf,
  isBot,
  isMutedLocally,
  isRemoteMuted,
  isSpeaking,
  onPress,
}: {
  isSelf?: boolean;
  isBot?: boolean;
  isMutedLocally?: boolean;
  isRemoteMuted?: boolean;
  isSpeaking?: boolean;
  onPress: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse only when actively speaking
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isSpeaking) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 380, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== "web" }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isSpeaking, pulseAnim]);

  // Determine appearance based on voice state
  let iconName: "mic" | "mic-off" | "volume-mute" = "mic";
  let activeColor = "#22c55e";
  let activeBg = "rgba(34, 197, 94, 0.22)";
  let activeBorder = "#22c55e";

  if (isBot) {
    iconName = "mic-off";
    activeColor = "#475569";
    activeBg = "rgba(15, 23, 42, 0.4)";
    activeBorder = "rgba(255, 255, 255, 0.05)";
  } else if (isSelf) {
    if (isMutedLocally) {
      iconName = "mic-off";
      activeColor = "#64748b";
      activeBg = "rgba(100, 116, 139, 0.15)";
      activeBorder = "rgba(100, 116, 139, 0.35)";
    } else {
      iconName = "mic";
      activeColor = isSpeaking ? "#22c55e" : "#3ddc78";
      activeBg = isSpeaking ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.18)";
      activeBorder = "#22c55e";
    }
  } else if (isMutedLocally) {
    // Local user muted this player for themselves ("volume-mute" icon!)
    iconName = "volume-mute";
    activeColor = "#f43f5e";
    activeBg = "rgba(244, 63, 94, 0.18)";
    activeBorder = "#f43f5e";
  } else if (isRemoteMuted) {
    // Remote player has their mic off
    iconName = "mic-off";
    activeColor = "#64748b";
    activeBg = "rgba(100, 116, 139, 0.12)";
    activeBorder = "rgba(100, 116, 139, 0.25)";
  } else if (isSpeaking) {
    // Actively speaking
    iconName = "mic";
    activeColor = "#22c55e";
    activeBg = "rgba(34, 197, 94, 0.3)";
    activeBorder = "#22c55e";
  } else {
    // In voice channel, unmuted & idle
    iconName = "mic";
    activeColor = "#00f0ff";
    activeBg = "rgba(0, 240, 255, 0.12)";
    activeBorder = "rgba(0, 240, 255, 0.35)";
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: isBot ? 0.35 : 1,
      }}
      activeOpacity={0.8}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          borderWidth: 1.5,
          borderColor: activeBorder,
          backgroundColor: activeBg,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={activeColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Production Result Modal: Exact Match Reference Mockup (Winner & Loser) ──
function SpinResultModal({
  isMyWin,
  prizeAmount = 0,
  userBet = 100,
  totalPrizePool = 500,
  handlePlayAgain,
  onLeave,
  language = "en",
}: {
  isMyWin: boolean;
  prizeAmount?: number;
  userBet?: number;
  totalPrizePool?: number;
  handlePlayAgain: () => void;
  onLeave: () => void;
  language?: string;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();

    // Play victory fanfare or authentic loser sound
    if (isMyWin) {
      playWinFanfare();
    } else {
      playLoseSound();
    }
  }, [enterAnim, isMyWin]);

  const modalScale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Animated.View
      style={{
        backgroundColor: "#0c1222",
        borderWidth: 1.5,
        borderColor: isMyWin ? "#10b981" : "#38bdf8",
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        alignItems: "center",
        width: "92%",
        maxWidth: 360,
        zIndex: 50,
        opacity: enterAnim,
        transform: [{ scale: modalScale }],
        position: "relative",
      }}
    >
      {/* Upper-right Close Button */}
      <TouchableOpacity
        onPress={onLeave}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        }}
        activeOpacity={0.7}
        accessibilityLabel="Close Result"
      >
        <Ionicons name="close" size={17} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 3D Wheel Illustration Asset */}
      <View style={{ width: 170, height: 122, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Image
          source={isMyWin ? wonBoardCardImg : lostBoardCardImg}
          style={{ width: "100%", height: "100%", resizeMode: "contain" }}
        />
      </View>

      {/* Result Heading */}
      <Text style={{ fontSize: 26, fontWeight: "900", letterSpacing: 0.6, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <Text style={{ color: "#FFFFFF" }}>YOU </Text>
        <Text style={{ color: isMyWin ? "#10b981" : "#38bdf8" }}>
          {isMyWin ? "WON!" : "LOST!"}
        </Text>
      </Text>

      {/* Supporting Heading */}
      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginTop: 4, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        {isMyWin
          ? (language === "am" ? "እንኳን ደስ አሎት!" : "Congratulations!")
          : (language === "am" ? "በሚቀጥለው ዙር ይሞክሩ!" : "Better luck next time!")}
      </Text>

      {/* Supporting Message */}
      <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 6, lineHeight: 17 }}>
        {isMyWin
          ? (language === "am" ? "ይህንን ስፒን አሸንፈዋል! ሽልማትዎን ይደሰቱ!" : "You've won this spin. Enjoy your reward!")
          : (language === "am" ? "መሽከርከርዎን ይቀጥሉ እና እንደገና ዕድልዎን ይሞክሩ።" : "Keep spinning and try your luck again.")}
      </Text>

      {/* Prize Box (Matching Mockup with CoinStackIcon) */}
      <View
        style={{
          width: "100%",
          backgroundColor: "#101932",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isMyWin ? "rgba(16, 185, 129, 0.3)" : "rgba(56, 189, 248, 0.25)",
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginTop: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <CoinStackIcon size={32} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: "600" }}>
            {language === "am" ? "ሽልማት" : "Prize"}
          </Text>
          <Text
            style={{
              color: isMyWin ? "#facc15" : "#ffffff",
              fontSize: 22,
              fontWeight: "900",
              fontFamily: "Inter, sans-serif",
              marginTop: 2,
            }}
          >
            {isMyWin
              ? `${Number(prizeAmount || 0).toLocaleString()} ETB`
              : "0 ETB"}
          </Text>
          {!isMyWin && (
            <Text style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: "500", marginTop: 1 }}>
              {language === "am" ? "(አላሸነፉም)" : "(You didn't win)"}
            </Text>
          )}
        </View>
      </View>

      {/* Two-Column Stat Row: Entry Fee & Total Prize Pool (Exact Mockup Match) */}
      <View
        style={{
          width: "100%",
          backgroundColor: "#0d152a",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          paddingVertical: 10,
          paddingHorizontal: 14,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* Left: Entry Fee */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <CoinStackIcon size={13} />
            <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600" }}>
              {language === "am" ? "የመግቢያ ክፍያ" : "Entry Fee"}
            </Text>
          </View>
          <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800", fontFamily: "Inter, sans-serif", marginTop: 3 }}>
            {Number(userBet || 100).toLocaleString()} ETB
          </Text>
        </View>

        {/* Vertical Divider */}
        <View style={{ width: 1, height: 26, backgroundColor: "rgba(255, 255, 255, 0.12)", marginHorizontal: 8 }} />

        {/* Right: Total Prize Pool */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <CoinStackIcon size={13} />
            <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "600" }}>
              {language === "am" ? "ጠቅላላ ሽልማት" : "Total Prize Pool"}
            </Text>
          </View>
          <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "800", fontFamily: "Inter, sans-serif", marginTop: 3 }}>
            {Number(totalPrizePool || (userBet * 5)).toLocaleString()} ETB
          </Text>
        </View>
      </View>

      {/* Action Buttons: Play Again & Leave */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePlayAgain}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 12,
            backgroundColor: "#162038",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
            {language === "am" ? "እንደገና ተጫወት" : "Play Again"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onLeave}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 12,
            backgroundColor: isMyWin ? "#10b981" : "#2563eb",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
            {language === "am" ? "ውጣ" : "Leave"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}


// ── Types ──────────────────────────────────────────────────────────────────
type SpinPlayer = {
  userId: string;
  username: string;
  seatIndex: number;
  avatar?: string | null;
  isBot?: boolean;
  stake?: number;
};

type RoundState = {
  roundId: string;
  configId: number;
  betAmount: number;
  maxPlayers: number;
  roomName: string;
  status: "waiting" | "locked" | "spinning" | "resolved" | "paid" | "cancelled";
  countdown: number;
  players: SpinPlayer[];
  pot: number;
  mode: "5_PLAYER" | "RAIL";
};

// ── Screen states ──────────────────────────────────────────────────────────
type ScreenState = "browse" | "waiting" | "spinning" | "result";

export default function SpinGameScreen() {
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isCompactScreen = screenH < 740;
  const mobileWheelSize = Math.max(
    280,
    Math.min(
      screenW - 32,
      isCompactScreen ? 310 : 360,
      Math.round(screenH * 0.43)
    )
  );
  const { token, user, refreshProfile, language, switchLanguage, setLanguage, showAlert } = useAuth();
  const serverBalance = Number(user?.available_balance || 0);
  const [localBalanceDelta, setLocalBalanceDelta] = useState(0);

  useEffect(() => {
    setLocalBalanceDelta(0);
  }, [user?.available_balance]);

  const balance = Math.max(0, serverBalance + localBalanceDelta);
  const { mode, stake } = useLocalSearchParams();
  const { ensureConnected, emitAck, onMessage, send } = useSocket();

  const { isPlaying: bgMusicPlaying, muteMusic } = useBackgroundMusic();
  const muteMusicRef = useRef(muteMusic);
  useEffect(() => {
    muteMusicRef.current = muteMusic;
  }, [muteMusic]);

  // ---------- Sound Effects (Synthesized via pinTickAudio) ----------
  const playClick = useCallback(() => {
    try {
      playTickSound();
    } catch (e) { console.warn("clickSound error:", e); }
  }, []);

  const playWin = useCallback(() => {
    try {
      playWinFanfare();
    } catch (e) { console.warn("winSound error:", e); }
  }, []);

  const playLose = useCallback(() => {
    try {
      playLoseSound();
    } catch (e) { console.warn("loseSound error:", e); }
  }, []);

  const playSpinLoop = useCallback(() => {
    // Replaced by realistic 20-pin physical ticker in SpinWheel using spin-sound-1.wav
  }, []);

  const stopSpinLoop = useCallback(() => {
    // Wheel ticker terminates cleanly when rotation completes
  }, []);

  const isSpinningRef = useRef(false);
  const pendingResultDataRef = useRef<{ winnerId: string; winnerName: string; prizeAmount: number } | null>(null);
  const resultShownRoundIdRef = useRef<string | null>(null);

  const handleSpinComplete = useCallback(() => {
    stopSpinLoop();
    stopSpinSoundLoop();
    setIsSpinning(false);
    isSpinningRef.current = false;

    // Show celebration on the wheel board first!
    if (pendingResultDataRef.current) {
      const res = pendingResultDataRef.current;
      setResultData(res);
      const isWinner = Boolean(
        user && (
          String(res.winnerId) === String(user.id) ||
          String(res.winnerId) === String((user as any)?._id) ||
          (res.winnerName && user.username && res.winnerName.toLowerCase() === user.username.toLowerCase())
        )
      );
      if (isWinner) {
        setLocalBalanceDelta(prev => prev + Number(res.prizeAmount || 0));
        playWin();
        setTimeout(() => refreshProfile(true), 1200);
      } else {
        playLose();
        setTimeout(() => refreshProfile(true), 1500);
      }

      // Celebratory board display before presenting modal popup
      setTimeout(() => {
        const curId = roundRef.current?.roundId;
        if (!curId || resultShownRoundIdRef.current !== curId) {
          if (curId) resultShownRoundIdRef.current = curId;
          playPopupSound();
          setScreenState("result");
        }
      }, 2500);
    }
  }, [stopSpinLoop, user, playWin, playLose, refreshProfile]);

  const stopAllSounds = useCallback(() => {
    try { stopSpinLoop(); } catch (e) {}
  }, [stopSpinLoop]);

  const playAddMoney = useCallback(() => {
    try { playTickSound(); } catch (e) { console.warn("addMoneySound error:", e); }
  }, []);

  // ── State ────────────────────────────────────────────────────────────
  const [screenState, setScreenState] = useState<ScreenState>("browse");
  const [round, setRound] = useState<RoundState | null>(null);
  const is5Player = round?.mode === "5_PLAYER" || mode === "5_PLAYER";
  const isRail = round?.mode === "RAIL" || mode === "RAIL";
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningSlice, setWinningSlice] = useState<number | null>(null);
  const [spinDuration, setSpinDuration] = useState(5000);
  const [resultData, setResultData] = useState<{
    winnerId: string;
    winnerName: string;
    prizeAmount: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [addAmount, setAddAmount] = useState(() => (stake && Number(stake) > 0 ? Number(stake) : 100));
  const [addLoading, setAddLoading] = useState(false);
  const [mobilePlayersSheetVisible, setMobilePlayersSheetVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [incomingSpinInvite, setIncomingSpinInvite] = useState<SpinInvitePayload | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [preSpinCountdown, setPreSpinCountdown] = useState<number | null>(null);

  // Listen for real-time spin invitation from other players
  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage((msg) => {
      if (msg.type === "spin:invite_received") {
        setIncomingSpinInvite(msg.payload);
      }
    });
    return unsub;
  }, [onMessage]);

  const handleAcceptSpinInvite = () => {
    if (!incomingSpinInvite) return;
    const inv = incomingSpinInvite;
    setIncomingSpinInvite(null);
    handleJoinRoom(inv.mode || "5_PLAYER", inv.entryAmount || 100);
  };

  const handleDeclineSpinInvite = () => {
    setIncomingSpinInvite(null);
  };
  const preSpinTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  // Store pending spin data so we can defer the spin until preSpinCountdown finishes
  const pendingSpinDataRef = useRef<{ winningSlice: number; spinDuration: number; roundId: string; winnerId?: string } | null>(null);
  const [pendingWinnerId, setPendingWinnerId] = useState<string | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  // Web Accessibility: Blur active element when modals open to avoid "Blocked aria-hidden" console warning
  useEffect(() => {
    if (Platform.OS === "web" && (languageMenuVisible || showLeaveConfirm || mobilePlayersSheetVisible || depositVisible || withdrawVisible)) {
      if (typeof document !== "undefined" && document.activeElement && "blur" in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, [languageMenuVisible, showLeaveConfirm, mobilePlayersSheetVisible, depositVisible, withdrawVisible]);

  // Top floating pill notification (Exact Image 2)
  const [topBanner, setTopBanner] = useState<{
    type: "info" | "warning" | "error" | "success";
    message: string;
  } | null>(null);
  const bannerTimerRef = useRef<any>(null);

  const roundRef = useRef<RoundState | null>(null);
  useEffect(() => { roundRef.current = round; }, [round]);

  // Floating Bet Reaction System (Exact Prototype Match)
  const [reactions, setReactions] = useState<BetReaction[]>([]);
  const [flashingUserIds, setFlashingUserIds] = useState<string[]>([]);
  const ribbonBumpAnim = useRef(new Animated.Value(1)).current;

  const triggerBetReaction = useCallback((player: any, amount: number) => {
    playCoinSound();

    const pid = String(player?.userId || player?.id || "");
    if (pid) {
      setFlashingUserIds(prev => [...prev, pid]);
      setTimeout(() => {
        setFlashingUserIds(prev => prev.filter(x => x !== pid));
      }, 600);
    }

    // Bump the jackpot ribbon
    ribbonBumpAnim.setValue(1.15);
    Animated.spring(ribbonBumpAnim, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start();

    // Compute coordinate relative to wheel center
    const curRound = roundRef.current;
    const allPlayers = curRound?.players || [];
    const totalDisplayPot = allPlayers.reduce((s: number, p: any) => s + (Number(p.stake) || 100), 0);
    let cumulativeAngle = -Math.PI / 2;
    let targetMidAngle = -Math.PI / 2;

    for (let i = 0; i < allPlayers.length; i++) {
      const p = allPlayers[i];
      const pAngle = totalDisplayPot > 0 ? ((Number(p.stake) || 100) / totalDisplayPot) * (Math.PI * 2) : (Math.PI * 2) / Math.max(1, allPlayers.length);
      if (String(p.userId) === pid) {
        targetMidAngle = cumulativeAngle + pAngle / 2;
        break;
      }
      cumulativeAngle += pAngle;
    }

    const currentWheelSize = isDesktop ? Math.min(screenW * 0.32, 420) : mobileWheelSize;
    const cx = currentWheelSize / 2;
    const cy = currentWheelSize / 2;
    const radius = currentWheelSize * 0.32;
    const rx = cx + Math.cos(targetMidAngle) * radius;
    const ry = cy + Math.sin(targetMidAngle) * radius;

    const playerIdx = allPlayers.findIndex((p: any) => String(p.userId) === pid);
    const pal = getPlayerPalette(player, playerIdx >= 0 ? playerIdx : 0, user?.id);

    const reactionId = `react_${Date.now()}_${Math.random()}`;
    const newReaction: BetReaction = {
      id: reactionId,
      x: rx,
      y: ry,
      playerName: String(player?.username || player?.display_name || "PLAYER").slice(0, 8),
      amount,
      pal,
    };

    setReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 1250);
  }, [mobileWheelSize, ribbonBumpAnim, user]);

  const showTopBanner = useCallback((type: "info" | "warning" | "error" | "success", message: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setTopBanner({ type, message });
    bannerTimerRef.current = setTimeout(() => {
      setTopBanner(null);
    }, 4500);
  }, []);

  // Active 1-second countdown ticker: ensures countdown visibly ticks down in real-time
  useEffect(() => {
    if (screenState !== "waiting" && screenState !== "spinning") return;
    const interval = setInterval(() => {
      if (targetEndTimeRef.current) {
        const rem = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setCountdown(rem);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [screenState]);
  // ── Rematch State ──────────────────────────────────────────────
  const [rematchAvailable, setRematchAvailable] = useState<{ originalRoundId: string; timeoutMs: number; betAmount: number } | null>(null);
  const [rematchAccepted, setRematchAccepted] = useState<boolean>(false);
  const [rematchCount, setRematchCount] = useState<number>(0);

  // ── Voice Chat State ───────────────────────────────────────────
  const [micMuted, setMicMuted] = useState(true);
  const [betAmount, setBetAmount] = useState(() => (stake && Number(stake) > 0 ? Number(stake) : 100));
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [preJoinRoom, setPreJoinRoom] = useState<any | null>(null);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [masterSpeakerMuted, setMasterSpeakerMuted] = useState(false);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);
  const [remoteMicMuted, setRemoteMicMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = voiceService.onSpeaking((speakers) => {
      setSpeakingUserIds(speakers);
    });
    return () => unsub();
  }, []);
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, number>>({});

  const mutedPlayersRef = useRef<Set<string>>(new Set());
  const masterSpeakerMutedRef = useRef(false);
  const [mutedRemoteUsers, setMutedRemoteUsers] = useState<Record<string, boolean>>({});
  const [allRemoteMuted, setAllRemoteMuted] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  useEffect(() => {
    mutedPlayersRef.current = mutedPlayers;
  }, [mutedPlayers]);

  useEffect(() => {
    masterSpeakerMutedRef.current = masterSpeakerMuted;
  }, [masterSpeakerMuted]);

  const isSpeaking = useCallback((userId: string) => {
    const lastActive = speakingUsers[userId];
    if (!lastActive) return false;
    return Date.now() - lastActive < 1000;
  }, [speakingUsers]);

  const toggleMutePlayer = useCallback((targetUserId: string) => {
    setMutedPlayers(prev => {
      const next = new Set(prev);
      const isCurrentlyMuted = next.has(targetUserId);
      const nextMuted = !isCurrentlyMuted;
      if (isCurrentlyMuted) {
        next.delete(targetUserId);
        showTopBanner("info", language === "am" ? "ተጫዋቹ ድምፅ ተከፍቷል" : "Player unmuted");
      } else {
        next.add(targetUserId);
        showTopBanner("info", language === "am" ? "ተጫዋቹን አጥፍተዋል (ለእርስዎ ብቻ ድምፅ አይሰማም)" : "Player muted for you");
      }
      voiceService.muteRemoteUser(targetUserId, nextMuted);
      return next;
    });
  }, [language, showTopBanner]);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== "web") return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result;
            if (arrayBuffer) {
              send("spin:voice_chunk", { chunk: arrayBuffer });
            }
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      mediaRecorder.start(250);
    } catch (err) {
      console.warn("Voice capture failed:", err);
    }
  }, [send]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (screenState === "waiting" && !micMuted) {
      startRecording();
    } else {
      stopRecording();
    }
    return () => {
      stopRecording();
    };
  }, [screenState, micMuted, startRecording, stopRecording]);

  const isDesktop = Platform.OS === "web" && screenW >= 900;

  // ── Redirect fallback if no active round and browse state ───────────
  // Skip redirect if `mode` param is present — the auto-join effect hasn't fired yet.
  useEffect(() => {
    if (screenState === "browse" && !joinLoading && !round && !mode) {
      router.replace("/(authed)/home/gameplay");
    }
  }, [screenState, joinLoading, round, router, mode]);

  // ── Stuck-state recovery ────────────────────────────────────────────
  // If the game gets stuck (e.g. socket disconnected during spin or waiting at 0:00), auto-recover
  useEffect(() => {
    if (screenState !== "spinning" && screenState !== "waiting") return;

    const timeoutDuration = screenState === "spinning" ? 20000 : 7000;
    const stuckTimeout = setTimeout(() => {
      if (screenState === "spinning") {
        // Stuck in spinning for 20s — force recover
        console.warn("[SPIN] Stuck in spinning state, auto-recovering...");
        stopSpinLoop();
        setIsSpinning(false);
        setScreenState("browse");
        setRound(null);
        setWinningSlice(null);
        setPendingWinnerId(null);
        pendingSpinDataRef.current = null;
        setResultData(null);
        setError("Connection lost during spin. Please try again.");
        refreshProfile();
      } else if (screenState === "waiting" && countdown <= 0 && roundRef.current) {
        console.warn("[SPIN] Stuck in waiting state at 0:00, checking server status...");
        emitAck("spin:get_state", { roundId: roundRef.current.roundId, token }).then((res: any) => {
          if (!res?.ok || res?.error === "ROUND_NOT_FOUND" || res.data?.status === "cancelled") {
            setError("Round ended or was cancelled. Returning to lobby.");
            stopSpinLoop();
            setIsSpinning(false);
            setScreenState("browse");
            setRound(null);
            refreshProfile();
          }
        }).catch(() => {
          setScreenState("browse");
          setRound(null);
          refreshProfile();
        });
      }
    }, timeoutDuration);

    return () => clearTimeout(stuckTimeout);
  }, [screenState, countdown, stopSpinLoop, refreshProfile, emitAck, token]);

  // ── Socket message handler ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onMessage((msg) => {
      const { type, payload } = msg;

      switch (type) {
        case "spin:player_mic_state":
          if (payload?.userId) {
            setRemoteMicMuted(prev => ({ ...prev, [payload.userId]: !!payload.muted }));
          }
          break;

        case "spin:player_joined":
          triggerBetReaction({ userId: payload.userId, username: payload.username }, Number(payload.stake) || 100);
          setRound(prev => {
            if (!prev || prev.roundId !== payload.roundId) return prev;
            if (prev.players.some(p => p.userId === payload.userId)) return prev;
            const updatedPlayers = [
              ...prev.players,
              {
                userId: payload.userId,
                username: payload.username,
                seatIndex: payload.seatIndex,
                avatar: payload.avatar,
                stake: payload.stake,
              },
            ];
            return {
              ...prev,
              players: updatedPlayers,
              pot: prev.mode === "5_PLAYER"
                ? prev.betAmount * updatedPlayers.length
                : updatedPlayers.reduce((sum, p) => sum + Number(p.stake || 0), 0),
            };
          });
          break;

        case "spin:player_left":
          setRound(prev => {
            if (!prev || prev.roundId !== payload.roundId) return prev;
            const updated = prev.players.filter(p => p.userId !== payload.userId);
            return {
              ...prev,
              players: updated,
              pot: prev.mode === "5_PLAYER"
                ? prev.betAmount * updated.length
                : updated.reduce((sum, p) => sum + Number(p.stake || 0), 0),
            };
          });
          break;

        case "spin:stake_updated":
          triggerBetReaction({ userId: payload.userId, username: payload.username || "PLAYER" }, Number(payload.addedAmount) || 10);
          setRound(prev => {
            if (!prev || prev.roundId !== payload.roundId) return prev;
            const updated = prev.players.map(p => {
              if (p.userId === payload.userId) {
                return { ...p, stake: payload.newStake };
              }
              return p;
            });
            return {
              ...prev,
              players: updated,
              pot: payload.pot,
            };
          });
          break;
        
        case "spin:countdown": {
          const sec = payload.secondsLeft;
          targetEndTimeRef.current = Date.now() + sec * 1000;
          setCountdown(sec);
          break;
        }

        case "spin:locked":
          setRound(prev => {
            if (prev && prev.roundId !== payload.roundId) return prev;
            return {
              ...(prev || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL" }),
              status: "locked",
              pot: payload.pot,
              players: payload.players || (prev ? prev.players : []),
            } as RoundState;
          });
          // Start 3-2-1 pre-spin countdown
          setPreSpinCountdown(3);
          if (preSpinTimerRef.current) clearInterval(preSpinTimerRef.current);
          preSpinTimerRef.current = setInterval(() => {
            setPreSpinCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(preSpinTimerRef.current);
                preSpinTimerRef.current = null;
                return null;
              }
              return prev - 1;
            });
          }, 1000);
          break;

        case "spin:start":
          // Server officially fires the spin with confirmed winningSlice and winnerId
          if (preSpinTimerRef.current) {
            clearInterval(preSpinTimerRef.current);
            preSpinTimerRef.current = null;
          }
          setPreSpinCountdown(null);
          setWinningSlice(payload.winningSlice);
          setSpinDuration(payload.spinDuration || 5000);
          setPendingWinnerId(payload.winnerId || null);
          pendingResultDataRef.current = null;

          isSpinningRef.current = true;
          setIsSpinning(true);
          setScreenState("spinning");
          setRound(r => {
            if (r && r.roundId !== payload.roundId) return r;
            playSpinLoop();
            return {
              ...(r || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL" }),
              status: "spinning",
              players: payload.players || (r ? r.players : []),
            } as RoundState;
          });
          break;

        case "spin:result":
          setRound(prev => {
            if (prev && prev.roundId !== payload.roundId) return prev;
            return {
              ...(prev || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL", players: [] }),
              status: "resolved",
            } as RoundState;
          });

          const roundResult = {
            winnerId: payload.winnerId,
            winnerName: payload.winnerName,
            prizeAmount: payload.prizeAmount,
          };

          // If the wheel is still in motion, queue the result so the pointer visibly lands FIRST!
          if (isSpinningRef.current) {
            pendingResultDataRef.current = roundResult;
          } else {
            const curId = payload.roundId || roundRef.current?.roundId;
            if (!curId || resultShownRoundIdRef.current !== curId) {
              if (curId) resultShownRoundIdRef.current = curId;
              stopSpinLoop();
              setResultData(roundResult);
              setScreenState("result");
              const isUserInRound = round?.players.some(p => p.userId === user?.id);
              if (isUserInRound) {
                if (payload.winnerId === user?.id) {
                  playWin();
                } else {
                  playLose();
                }
              }
            }
          }
          // Refresh balance
          setTimeout(() => refreshProfile(), 1500);
          break;

        case "spin:rematch_available":
          setRematchAvailable({
            originalRoundId: payload.originalRoundId,
            timeoutMs: payload.timeoutMs || 15000,
            betAmount: payload.betAmount || 100,
          });
          setRematchAccepted(false);
          setRematchCount(0);
          break;

        case "spin:rematch_status":
          setRematchCount(payload.acceptedCount || 0);
          break;

        case "spin:rematch_started":
          if (payload.data) {
            setRound(payload.data as RoundState);
            setScreenState("waiting");
            setIsSpinning(false);
            setWinningSlice(null);
        setPendingWinnerId(null);
        pendingSpinDataRef.current = null;
            setResultData(null);
            setRematchAvailable(null);
            setRematchAccepted(false);
            setRematchCount(0);
          }
          break;

        case "spin:cancelled":
          stopSpinLoop();
          setError("Room cancelled: " + (payload.reason || "Not enough players"));
          setScreenState("browse");
          setRound(null);
          setIsSpinning(false);
          setWinningSlice(null);
          setPendingWinnerId(null);
          pendingSpinDataRef.current = null;
          setResultData(null);
          joinAttemptedRef.current = false;
          // Refresh balance (refund)
          setTimeout(() => refreshProfile(), 1000);
          break;

        case "spin:player_muted":
          if (payload.userId === user?.id) {
            setMicMuted(payload.muted);
            voiceService.setMute(payload.muted);
          } else {
            const remoteUid = voiceService.stringToUid(payload.userId);
            voiceService.muteRemoteUser(remoteUid, payload.muted);
            setMutedPlayers(prev => {
              const next = new Set(prev);
              if (payload.muted) next.add(payload.userId);
              else next.delete(payload.userId);
              return next;
            });
          }
          break;

        case "spin:error":
          const errMsg = payload.message || "Something went wrong";
          setError(errMsg);
          showTopBanner("error", errMsg);
          break;

        case "spin:voice_chunk":
          const { userId, chunk } = payload;
          if (mutedPlayersRef.current.has(userId) || masterSpeakerMutedRef.current) break;

          if (Platform.OS === "web" && chunk) {
            try {
              const blob = new Blob([chunk], { type: "audio/webm;codecs=opus" });
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.play().catch(() => {});
            } catch (e) {
              console.warn("Audio playback error:", e);
            }
          }

          setSpeakingUsers(prev => ({
            ...prev,
            [userId]: Date.now(),
          }));
          break;
      }
    });

    return () => {
      unsub();
      stopSpinLoop();
    };
  }, [onMessage, refreshProfile, stopSpinLoop]);

  const joinAttemptedRef = useRef(false);

  // ── Join room handler ────────────────────────────────────────────────
  const handleJoinRoom = useCallback(async (roomMode: string, stakeVal?: number) => {
    setJoinLoading(true);
    setError(null);

    try {
      const connected = await ensureConnected(token || undefined);
      if (!connected) {
        joinAttemptedRef.current = false;
        setError("Connection failed. Please try again.");
        return;
      }

      const result = await emitAck("spin:join", { mode: roomMode, stake: stakeVal, token });
      
      if (result.ok && result.data) {
        muteMusicRef.current?.();
        const state = result.data as RoundState;
        setRound(state);
        const serverCountdown = state.countdown || 0;
        setCountdown(serverCountdown);
        setScreenState("waiting");
        setIsSpinning(false);
        setWinningSlice(null);
        setPendingWinnerId(null);
        setResultData(null);
        const deducted = Number(stakeVal || state.betAmount || 0);
        if (deducted > 0) {
          setLocalBalanceDelta(prev => prev - deducted);
        }
        setTimeout(() => refreshProfile(true), 350);

        // Start a smooth client-side countdown timer based on target timestamp
        targetEndTimeRef.current = Date.now() + serverCountdown * 1000;
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (serverCountdown > 0) {
          countdownTimerRef.current = setInterval(() => {
            if (!targetEndTimeRef.current) return;
            const rem = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
            setCountdown(rem);
            if (rem <= 0) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
              targetEndTimeRef.current = null;
              setCountdown(0);
              // Active server sync on countdown expiry to prevent hanging at 0:00
              setTimeout(() => {
                const curRound = roundRef.current;
                if (curRound?.roundId && !isSpinningRef.current) {
                  emitAck("spin:get_state", { roundId: curRound.roundId, token }).then((res: any) => {
                    if (res?.ok && res.data) {
                      const st = res.data;
                      if (st.status === "locked") {
                        setRound(prev => prev ? { ...prev, status: "locked", pot: st.pot, players: st.players } : prev);
                        setPreSpinCountdown(3);
                      } else if (st.status === "spinning") {
                        if (typeof st.winningSlice === "number") setWinningSlice(st.winningSlice);
                        if (st.winnerId) setPendingWinnerId(st.winnerId);
                        setIsSpinning(true);
                        setScreenState("spinning");
                        setRound(prev => prev ? { ...prev, status: "spinning", players: st.players || prev.players } : prev);
                      } else if (st.status === "resolved" || st.status === "paid" || st.status === "ended") {
                        const resData = {
                          winnerName: st.winnerName || st.winner?.username || "Winner",
                          winnerId: st.winnerId || st.winner?.userId,
                          prizeAmount: st.prizeAmount || st.pot || 0,
                        };
                        if (isSpinningRef.current) {
                          pendingResultDataRef.current = resData;
                        } else {
                          const curId = roundRef.current?.roundId;
                          if (!curId || resultShownRoundIdRef.current !== curId) {
                            if (curId) resultShownRoundIdRef.current = curId;
                            setScreenState("result");
                            setResultData(resData);
                            setCountdown(0);
                          }
                        }
                      } else if (st.status === "cancelled") {
                        setError("Round ended: Not enough players joined. Your wager has been refunded.");
                        setScreenState("browse");
                        setRound(null);
                        setIsSpinning(false);
                        joinAttemptedRef.current = false;
                        refreshProfile();
                      }
                    } else if (res?.error === "ROUND_NOT_FOUND" || !res?.ok) {
                      setError("Round finished or cancelled. Returning to lobby.");
                      setScreenState("browse");
                      setRound(null);
                      setIsSpinning(false);
                      joinAttemptedRef.current = false;
                      refreshProfile();
                    }
                  }).catch(() => {});
                }
              }, 2500);
            }
          }, 300);
        }

        // Join Agora voice channel (fire and forget, don't block)
        const voiceUid = voiceService.stringToUid(user?.id || "");
        voiceService.initialize(AGORA_APP_ID).then(async (initialized) => {
          if (initialized) {
            try {
              await voiceService.joinChannel(state.roundId, voiceUid);
              await voiceService.setMute(true); // Default to muted
            } catch (e) {
              console.warn("[SPIN] Voice join failed (non-critical):", e);
            }
          }
        }).catch(() => {});
        setMicMuted(true);
      } else {
        joinAttemptedRef.current = false;
        const errMsg = result.error === "INSUFFICIENT_BALANCE"
          ? "Not enough balance. Deposit first!"
          : result.error === "ALREADY_IN_ROUND"
          ? "You're already in a spin room"
          : result.error === "ALREADY_IN_GAME"
          ? "Finish your current XO game first"
          : result.error === "INVALID_STAKE"
          ? "Invalid stake amount"
          : result.error === "SPIN_GAME_DISABLED"
          ? "🔧 The Spin game is currently under maintenance. Please check back later!"
          : result.error || "Failed to join room";
        setError(errMsg);
      }
    } catch (err: any) {
      joinAttemptedRef.current = false;
      setError(err.message || "Failed to join room");
    } finally {
      setJoinLoading(false);
    }
  }, [ensureConnected, emitAck, token, user]);

  // ── Auto-join room when screen comes into focus ──
  useFocusEffect(
    useCallback(() => {
      muteMusicRef.current?.();
      if (!joinAttemptedRef.current && !roundRef.current) {
        if (mode === "RAIL" && stake) {
          joinAttemptedRef.current = true;
          handleJoinRoom("RAIL", Number(stake));
        } else if (mode === "5_PLAYER") {
          joinAttemptedRef.current = true;
          handleJoinRoom("5_PLAYER", 100);
        }
      }

      return () => {
        // Stop audio when navigating away from the screen
        stopAllSounds();
        voiceService.leaveChannel();
        stopRecording();
      };
    }, [mode, stake, handleJoinRoom, stopAllSounds, stopRecording])
  );

  // Unmount cleanup: only clear active timers and clean up voice
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // ── Actual leave (called after confirmation) ────────────────────────
  const doLeaveRoom = useCallback(async () => {
    setShowLeaveConfirm(false);
    stopAllSounds();
    stopRecording();
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    voiceService.leaveChannel();
    if (round) {
      await emitAck("spin:leave", { roundId: round.roundId, token }).catch(() => {});
    }
    setScreenState("browse");
    setRound(null);
    setIsSpinning(false);
    setWinningSlice(null);
        setPendingWinnerId(null);
        pendingSpinDataRef.current = null;
    setResultData(null);
    joinAttemptedRef.current = false;
    refreshProfile();
    router.replace("/(authed)/home/gameplay");
  }, [round, emitAck, token, refreshProfile, router, stopAllSounds, stopRecording]);

  // ── Rematch vote handler ──────────────────────────────────────────
  const handleRematchClick = useCallback(async () => {
    if (!rematchAvailable || !token) return;
    try {
      const result = await emitAck("spin:rematch_vote", {
        roundId: rematchAvailable.originalRoundId,
        accept: true,
        token,
      });
      if (result.ok) {
        setRematchAccepted(true);
        if ((result as any).acceptedCount !== undefined) {
          setRematchCount((result as any).acceptedCount);
        }
      } else {
        if (result.error === "INSUFFICIENT_BALANCE") {
          setError("Not enough balance for 100 ETB rematch!");
        } else {
          setError("Rematch request failed.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit rematch vote.");
    }
  }, [rematchAvailable, token, emitAck]);

  // ── Leave room handler — shows confirmation popup ──────────────────
  // Block leaving when countdown <= 60s, or round is locked/spinning in Rail mode
  const isUserInRound = Boolean(round && Array.isArray(round.players) && round.players.some((p: any) => String(p.userId) === String(user?.id)));
  const leaveBlocked = Boolean(isUserInRound && ((countdown > 0 && countdown <= 60) || round?.status === "locked" || round?.status === "spinning") && !is5Player);

  // Trigger lockout notification & sound as soon as room locks
  const prevLeaveBlockedRef = useRef(false);
  useEffect(() => {
    if (leaveBlocked && !prevLeaveBlockedRef.current) {
      playLockoutSound();
      const msg = language === "am"
        ? "🔒 ውርርድ ተዘግቷል፡ ስፒኑ ከመጀመሩ በፊት ከክፍሉ መውጣት አይቻልም።"
        : "🔒 Room Locked: Stakes are in play. Exit is disabled until the round completes!";
      showTopBanner("warning", msg);
    }
    prevLeaveBlockedRef.current = leaveBlocked;
  }, [leaveBlocked, language, showTopBanner]);

  // Urgent countdown beeps (3, 2, 1)
  const lastBeepRef = useRef<number | null>(null);
  useEffect(() => {
    if (countdown > 0 && countdown <= 3 && countdown !== lastBeepRef.current) {
      lastBeepRef.current = countdown;
      playCountdownBeep();
    } else if (countdown === 0) {
      lastBeepRef.current = null;
    }
  }, [countdown]);

  const handleLeaveRoom = useCallback(() => {
    if (!isUserInRound) {
      router.replace("/(authed)/home/gameplay");
      return;
    }
    if (leaveBlocked) {
      playLockoutSound();
      const msg = language === "am"
        ? "🔒 ስፒኑ እስኪያልቅ ድረስ ከክፍሉ መውጣት አይቻልም! አሸናፊው ሲታወቅ መውጣት ይችላሉ።"
        : "🔒 Exit Locked: Stakes are locked for this round. You can leave once the winner is determined!";
      showTopBanner("warning", msg);
      return;
    }
    setShowLeaveConfirm(true);
  }, [isUserInRound, leaveBlocked, language, showTopBanner, router]);

  // ── Play again handler ───────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    stopSpinLoop();
    voiceService.leaveChannel();
    const currentMode = (round?.mode || mode || "5_PLAYER") as string;
    const currentStake = round?.betAmount || (stake ? Number(stake) : betAmount);
    setScreenState("browse");
    setRound(null);
    setIsSpinning(false);
    setWinningSlice(null);
        setPendingWinnerId(null);
        pendingSpinDataRef.current = null;
    setResultData(null);
    setCountdown(0);
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    joinAttemptedRef.current = true;
    handleJoinRoom(currentMode, currentStake);
  }, [round, mode, stake, betAmount, handleJoinRoom, stopSpinLoop]);

  // Fetch monthly leaderboard for 5-Player right panel
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/leaderboard/monthly`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
    }
  }, [token]);

  useEffect(() => {
    if (round?.mode === "5_PLAYER") {
      fetchLeaderboard();
    }
  }, [round?.mode, fetchLeaderboard]);

  // Poll active rooms to render live wheel preview before joining RAIL mode
  const fetchPreJoinRoom = useCallback(async () => {
    try {
      const res = await emitAck("spin:get_rooms", {});
      if (res.ok && res.data) {
        const railRoom = res.data.find((r: any) => r.id === 1);
        if (railRoom) {
          setPreJoinRoom(railRoom);
        }
      }
    } catch (e) {
      console.error("Fetch pre-join room error:", e);
    }
  }, [emitAck]);

  useEffect(() => {
    if (mode === "RAIL" && !round) {
      fetchPreJoinRoom();
      const interval = setInterval(fetchPreJoinRoom, 3000);
      return () => clearInterval(interval);
    }
  }, [mode, round, fetchPreJoinRoom]);

  // Voice Chat clean up
  useEffect(() => {
    return () => {
      voiceService.leaveChannel();
    };
  }, []);

  // ── Tab switch / App state recovery ────────────────────────────────
  // When user switches tabs or backgrounds the app, browser throttles timers.
  // On return, resync countdown from targetEndTimeRef and request fresh state.
  useEffect(() => {
    const syncActiveState = () => {
      if (roundRef.current) {
        if (targetEndTimeRef.current) {
          const rem = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
          setCountdown(rem);
        }
        emitAck("spin:get_state", { roundId: roundRef.current.roundId, token }).then((res: any) => {
          if (res?.ok && res.data) {
            setRound(res.data);
            const isResolved = res.data.status === "ended" || res.data.status === "resolved" || res.data.status === "paid";
            if (isResolved) {
              const resData = {
                winnerName: res.data.winnerName || res.data.winner?.username || "Winner",
                winnerId: res.data.winnerId || res.data.winner?.userId,
                prizeAmount: res.data.prizeAmount || res.data.pot || 0,
              };
              if (isSpinningRef.current) {
                pendingResultDataRef.current = resData;
              } else {
                const curId = res.data.roundId || roundRef.current?.roundId;
                if (!curId || resultShownRoundIdRef.current !== curId) {
                  if (curId) resultShownRoundIdRef.current = curId;
                  setResultData(resData);
                  setScreenState("result");
                  setCountdown(0);
                }
              }
            } else if (res.data.status === "cancelled") {
              setError("Round was cancelled. Balance refreshed.");
              setScreenState("browse");
              setRound(null);
              setIsSpinning(false);
            } else if (res.data.countdown > 0) {
              targetEndTimeRef.current = Date.now() + res.data.countdown * 1000;
              setCountdown(res.data.countdown);
            }
          } else if (res?.error === "ROUND_NOT_FOUND") {
            setRound(null);
            setScreenState("browse");
          }
        }).catch(() => {});
        refreshProfile?.();
      }
    };

    const handleAppStateChange = (nextState: string) => {
      if (nextState === "active") {
        syncActiveState();
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);

    let onVisibilityChange: (() => void) | null = null;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          syncActiveState();
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      sub.remove();
      if (onVisibilityChange && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [emitAck, token, refreshProfile]);

  const handleAddStake = useCallback(async (amount: number) => {
    setAddLoading(true);
    setError(null);
    try {
      const currentRoundId = roundRef.current?.roundId;
      const result = await emitAck("spin:add_stake", { amount, roundId: currentRoundId, token });
      if (result.ok) {
        playAddMoney();
        setLocalBalanceDelta(prev => prev - Number(amount));
        setTimeout(() => refreshProfile(true), 300);
        const successMsg = language === "am"
          ? `+${amount} ብር ወደ ውርርድዎ ተጨምሯል!`
          : `+${amount} ETB added to your stake!`;
        showTopBanner("success", successMsg);
      } else {
        const errorMsg = result.error === "INSUFFICIENT_BALANCE"
          ? (language === "am" ? "በቂ ሂሳብ የለዎትም። እባክዎ መጀመሪያ ተቀማጭ ያድርጉ!" : "Insufficient balance. Please deposit first!")
          : result.error === "ROUND_LOCKED"
          ? (language === "am" ? "የዚህ ዙር ውርርድ ተዘግቷል።" : "Betting is closed for this round.")
          : (result.error || "Failed to add stake");
        showTopBanner("error", errorMsg);
        setError(errorMsg);
      }
    } catch (e: any) {
      const errMsg = e.message || "Failed to add stake";
      showTopBanner("error", errMsg);
      setError(errMsg);
    } finally {
      setAddLoading(false);
    }
  }, [emitAck, token, playAddMoney, language, showTopBanner, triggerBetReaction, user]);

  const handleToggleMic = useCallback(async () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    await voiceService.setMute(nextMuted);
    if (round?.roundId) {
      send("spin:mic_toggle", { roundId: round.roundId, muted: nextMuted });
    }
  }, [micMuted, round?.roundId, send]);

  const handleToggleSpeaker = useCallback(async () => {
    const nextMuted = !masterSpeakerMuted;
    setMasterSpeakerMuted(nextMuted);
    // Locally mute all remote streams in Agora
    if (round?.players) {
      round.players.forEach(p => {
        if (p.userId !== user?.id && !p.isBot) {
          const pUid = voiceService.stringToUid(p.userId);
          voiceService.muteRemoteUser(pUid, nextMuted);
        }
      });
    }
  }, [masterSpeakerMuted, round?.players, user?.id]);

  const handleHostMuteUser = useCallback(async (targetUserId: string, isCurrentlyMuted: boolean) => {
    // Host mute target user for everyone
    await emitAck("spin:mute_player", { targetUserId, muted: !isCurrentlyMuted });
  }, [emitAck]);

  // ── Navigation ───────────────────────────────────────────────────────
  const handleNavClick = (screen: string) => {
    if (screen === "home") router.push("/(authed)/home/gameplay");
    else if (screen === "history") router.push("/(authed)/home/history");
    else if (screen === "leaderboard") router.push("/(authed)/home/leaderboard");
    else if (screen === "profile") router.push("/(authed)/home/account");
    else if (screen === "admin") router.push("/admin" as any);
  };

  const formatCountdown = useCallback((totalSec: number) => {
    const mins = Math.floor(Math.max(0, totalSec) / 60);
    const secs = Math.max(0, totalSec) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const previewPlayers = React.useMemo(() => {
    if (round) return round.players;
    // When user is not in a round, all slots remain empty (grey)
    return [];
  }, [round]);

  // Deduplicate and aggregate stakes by userId so the same user NEVER appears twice in slices or seats
  const displayPlayers = React.useMemo(() => {
    const rawList = round ? round.players : previewPlayers;
    const map = new Map<string, SpinPlayer>();
    for (const p of rawList) {
      if (!p || !p.userId) continue;
      const existing = map.get(p.userId);
      if (existing) {
        map.set(p.userId, {
          ...existing,
          stake: (Number(existing.stake) || 0) + (Number(p.stake) || 0),
        });
      } else {
        map.set(p.userId, { ...p });
      }
    }
    return Array.from(map.values());
  }, [round, previewPlayers]);

  // Sorted players: highest stake down to lowest (Image 3)
  const sortedPlayers = React.useMemo(() => {
    return [...displayPlayers].sort((a, b) => Number(b.stake || 0) - Number(a.stake || 0));
  }, [displayPlayers]);

  const previewPot = React.useMemo(() => {
    if (round?.pot) return round.pot;
    if (is5Player) return 500;
    const roomBet = preJoinRoom?.betAmount || betAmount;
    const roomCount = typeof preJoinRoom?.currentPlayers === "number" ? preJoinRoom.currentPlayers : 0;
    return (roomCount * roomBet) + betAmount;
  }, [round, is5Player, preJoinRoom?.currentPlayers, preJoinRoom?.betAmount, betAmount]);

  const isMyWin = Boolean(
    resultData &&
    user &&
    (String(resultData.winnerId) === String(user.id) ||
     String(resultData.winnerId) === String((user as any)?._id) ||
     (resultData.winnerName && user.username && resultData.winnerName.toLowerCase() === user.username.toLowerCase()))
  );

  useEffect(() => {
    if (screenState === "result" && resultData) {
      const isUserInRound = round?.players.some(p => p.userId === user?.id);
      if (isUserInRound) {
        if (isMyWin) {
          playWin();
        } else {
          playLose();
        }
      }
    }
  }, [screenState, resultData, isMyWin, playWin, playLose, round?.players, user?.id]);
  const wheelSize = isDesktop ? Math.min(screenW * 0.32, 400) : Math.min(screenW * 0.86, 330);

  // ══════════════════════════════════════════════════════════════════════
  // ██  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <View style={ds.root}>
      <Image
        source={spinBgRedDesktopImg}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10, 14, 26, 0.45)" }]} />

      {/* Modals */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />

      {/* ── TOP FLOATING NOTIFICATION PILL (EXACT MATCH IMAGE 2) ── */}
      {topBanner && (
        <View
          style={{
            position: "absolute",
            top: Platform.OS === "web" ? 22 : 52,
            left: 16,
            right: 16,
            zIndex: 99999,
            alignItems: "center",
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#ffffff",
              borderRadius: 30,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 18,
              elevation: 14,
              borderWidth: 1,
              borderColor: "rgba(0, 0, 0, 0.06)",
            }}
          >
            {/* Left Icon (Image 2 style) */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor:
                  topBanner.type === "warning" ? "rgba(245, 158, 11, 0.15)" :
                  topBanner.type === "error" ? "rgba(239, 68, 68, 0.15)" :
                  topBanner.type === "success" ? "rgba(16, 185, 129, 0.15)" :
                  "rgba(15, 23, 42, 0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons
                name={
                  topBanner.type === "warning" ? "lock-closed" :
                  topBanner.type === "error" ? "alert-circle" :
                  topBanner.type === "success" ? "checkmark-circle" :
                  "information-circle"
                }
                size={18}
                color={
                  topBanner.type === "warning" ? "#d97706" :
                  topBanner.type === "error" ? "#dc2626" :
                  topBanner.type === "success" ? "#059669" :
                  "#0f172a"
                }
              />
            </View>

            {/* Content text */}
            <Text
              style={{
                flex: 1,
                color: "#0f172a",
                fontSize: 13,
                fontWeight: "600",
                lineHeight: 18,
                fontFamily: "Inter, sans-serif",
              }}
              numberOfLines={2}
            >
              {topBanner.message}
            </Text>

            {/* Right Dismiss X Button (Image 2) */}
            <TouchableOpacity
              onPress={() => setTopBanner(null)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(15, 23, 42, 0.06)",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Leave Confirmation Modal */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade" onRequestClose={() => setShowLeaveConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" }}>
          <View style={{
            width: "85%",
            maxWidth: 360,
            backgroundColor: "#141830",
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#1f2744",
            padding: 28,
            alignItems: "center",
          }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderWidth: 1.5,
              borderColor: "#ef4444",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="exit-outline" size={28} color="#ef4444" />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>Leave Room?</Text>
            <Text style={{ color: "#8b93a7", fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 20, marginBottom: 24, fontFamily: "Inter, sans-serif" }}>
              You will forfeit your stake and leave the current spin room. Are you sure?
            </Text>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={() => setShowLeaveConfirm(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: "#1f2744",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  alignItems: "center",
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#8b93a7", fontSize: 13, fontWeight: "800" }}>STAY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={doLeaveRoom}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  borderWidth: 1.5,
                  borderColor: "#ef4444",
                  alignItems: "center",
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "900" }}>LEAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={languageMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setLanguageMenuVisible(false)}
        >
          <View
            style={{
              width: 290,
              backgroundColor: "#141830",
              borderRadius: 22,
              padding: 22,
              borderWidth: 1.5,
              borderColor: "rgba(139, 92, 246, 0.35)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.55,
              shadowRadius: 20,
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", marginBottom: 16, textAlign: "center" }}>
              {language === "am" ? "ቋንቋ ይምረጡ" : "Select Language"}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setLanguage?.("en");
                setLanguageMenuVisible(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: language === "en" ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: language === "en" ? "#8b5cf6" : "rgba(255, 255, 255, 0.08)",
                marginBottom: 10,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: language === "en" ? "#a78bfa" : "#e2e8f0", fontSize: 14, fontWeight: "800" }}>
                English (EN)
              </Text>
              {language === "en" && <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLanguage?.("am");
                setLanguageMenuVisible(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: language === "am" ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: language === "am" ? "#8b5cf6" : "rgba(255, 255, 255, 0.08)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: language === "am" ? "#a78bfa" : "#e2e8f0", fontSize: 14, fontWeight: "800" }}>
                አማርኛ (Amharic)
              </Text>
              {language === "am" && <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>



      {/* ── MAIN BODY ── */}
      {isDesktop ? (
        <ScrollView style={ds.body} contentContainerStyle={ds.bodyContent} showsVerticalScrollIndicator={false}>
          {is5Player ? (
            /* ════════════════════════════════════════════════════════════════
               ██  5-PLAYER SPIN ROOM LAYOUT (DESKTOP — EXACT MATCH IMAGE 4)
               ════════════════════════════════════════════════════════════════ */
            <View style={{ width: "100%", gap: 24 }}>
              {/* Top Subheader Bar (Image 4) */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <TouchableOpacity
                    onPress={() => router.replace("/(authed)/home/gameplay")}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <View>
                    <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                      5-Player Spin
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "500", marginTop: 2 }}>
                      {round ? `Waiting for players… ${round.players.length}/5` : "Join the room to enter the game"}
                    </Text>
                  </View>
                </View>

                {/* Voice mic & speaker controls */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    onPress={handleToggleMic}
                    disabled={!round}
                    style={[
                      ds.voiceControlBtn,
                      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
                      micMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" },
                      !round && { opacity: 0.4 }
                    ]}
                  >
                    <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#ef4444" : "#FF1744"} />
                    <Text style={[ds.voiceControlBtnText, { color: micMuted ? "#ef4444" : "#ffffff" }]}>
                      {micMuted ? "Mic Off" : "Mic On"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleSpeaker}
                    disabled={!round}
                    style={[
                      ds.voiceControlBtn,
                      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
                      masterSpeakerMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" },
                      !round && { opacity: 0.4 }
                    ]}
                  >
                    <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={16} color={masterSpeakerMuted ? "#ef4444" : "#ffffff"} />
                    <Text style={[ds.voiceControlBtnText, { color: masterSpeakerMuted ? "#ef4444" : "#ffffff" }]}>
                      {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
                    </Text>
                  </TouchableOpacity>

                  {/* Desktop 5-Player Invite Friends & Link button */}
                  <TouchableOpacity
                    onPress={() => setInviteModalVisible(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(255, 23, 68, 0.15)",
                      borderWidth: 1.5,
                      borderColor: "#FF1744",
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      cursor: "pointer",
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social" size={15} color="#FF1744" />
                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>
                      {language === "am" ? "ጓደኞችን ጋብዝ / ሊንክ" : "Invite Friends / Link"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Area: Wheel on Left, Room Players on Right (Image 4) */}
              <View style={{ flexDirection: "row", gap: 32, alignItems: "center" }}>
                {/* Left: Wheel + Action Buttons */}
                <View style={{ flex: 1.6, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                    <SpinWheel
                      size={Math.min(screenW * 0.32, 420)}
                      players={round ? round.players : previewPlayers}
                      isSpinning={Boolean(screenState === "spinning" || round?.status === "spinning" || isSpinning)}
                      winningSlice={winningSlice}
                      winnerId={pendingWinnerId || resultData?.winnerId}
                      winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
                      prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
                      spinDuration={spinDuration}
                      onSpinComplete={handleSpinComplete}
                      status={screenState === "result" ? "resolved" : (round ? round.status : "waiting")}
                      mode="5_PLAYER"
                      speakingUserIds={speakingUserIds}
                      countdown={countdown}
                      countdownText={countdown > 0 ? formatCountdown(countdown) : (round?.status === "locked" || round?.status === "spinning" ? "0:00" : "02:00")}
                      currentUserId={user?.id}
                      flashingUserIds={flashingUserIds}
                    />

                    {/* Floating Bet Reaction Badges (PC Desktop Support) */}
                    {reactions.map((r) => (
                      <FloatingBetReactionBadge key={r.id} reaction={r} />
                    ))}
                  </View>

                  {/* Below Wheel Action Buttons (Image 4) */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 24 }}>
                    {round && round.players.some(p => String(p.userId) === String(user?.id)) ? (
                      <TouchableOpacity
                        onPress={handleLeaveRoom}
                        style={[
                          ds.leaveBtn,
                          { borderRadius: 24, paddingHorizontal: 32, paddingVertical: 12, marginTop: 0 }
                        ]}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="exit-outline" size={16} color="#ef4444" />
                        <Text style={ds.leaveBtnText}>{language === "am" ? "ከክፍሉ ውጣ" : "LEAVE ROOM"}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        disabled={Boolean(joinLoading || isSpinning || (round && round.players.length >= 5))}
                        onPress={() => handleJoinRoom("5_PLAYER", 100)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          backgroundColor: "#f43f5e",
                          borderRadius: 24,
                          paddingHorizontal: 28,
                          paddingVertical: 12,
                          opacity: Boolean(joinLoading || isSpinning || (round && round.players.length >= 5)) ? 0.6 : 1,
                        }}
                        activeOpacity={0.85}
                      >
                        {joinLoading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="people" size={18} color="#ffffff" />
                            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                              {round && round.players.length >= 5 ? "ROOM FULL" : "JOIN GAME (100 ETB)"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Right: Room Players List (Image 4) */}
                <View style={{ flex: 1.1, minWidth: 320 }}>
                  <View style={{
                    backgroundColor: "rgba(10, 16, 36, 0.85)",
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: "rgba(59, 130, 246, 0.2)",
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="people" size={18} color="#94a3b8" />
                        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                          ROOM PLAYERS ({round?.players?.length || 0}/5)
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setInviteModalVisible(true)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(255, 23, 68, 0.18)",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: "#FF1744",
                            cursor: "pointer",
                          }}
                        >
                          <Ionicons name="person-add" size={12} color="#FF1744" />
                          <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>
                            {language === "am" ? "+ ጋብዝ" : "+ Invite"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            const newAllMuted = !allRemoteMuted;
                            setAllRemoteMuted(newAllMuted);
                            voiceService.muteAllRemoteUsers(newAllMuted);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            backgroundColor: "rgba(15, 23, 42, 0.8)",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <Ionicons name={allRemoteMuted ? "volume-mute" : "volume-high"} size={13} color="#94a3b8" />
                          <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                            {allRemoteMuted ? "Muted All" : "Mute All"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 5 Vertical Seat Rows (Image 4) */}
                    <View style={{ gap: 10 }}>
                      {Array.from({ length: 5 }, (_, idx) => {
                        const player = round?.players && round.players[idx] ? round.players[idx] : null;
                        const isSelf = player?.userId === user?.id;
                        const isMuted = player ? mutedPlayers.has(player.userId) : false;
                        const isSelfHost = round?.players[0]?.userId === user?.id;
                        const isSpeaking = Boolean(player && Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(player.userId)));
                        return (
                          <View
                            key={player?.userId || idx}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: player ? "rgba(30, 41, 59, 0.6)" : "rgba(15, 23, 42, 0.5)",
                              borderRadius: 14,
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              borderWidth: 1,
                              borderColor: isSelf ? "#FF1744" : player ? "rgba(255, 23, 68, 0.3)" : "rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                              <View style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: isSelf ? "#FF1744" : player ? "#991B1B" : "rgba(255, 255, 255, 0.08)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                                <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{idx + 1}</Text>
                              </View>
                              <View style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: "rgba(255, 255, 255, 0.08)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                                <Ionicons name="person" size={16} color={player ? "#ffffff" : "#64748b"} />
                              </View>
                              <View>
                                <Text style={{ color: player ? "#ffffff" : "#64748b", fontSize: 13, fontWeight: "700" }}>
                                  {player ? (isSelf ? "You" : player.username) : "Waiting for player..."}
                                </Text>
                                <Text style={{ color: player ? "#FF5A6E" : "#475569", fontSize: 11, fontWeight: "600", marginTop: 1 }}>
                                  {player ? `${player.stake || 100} ETB` : "Empty Seat"}
                                </Text>
                              </View>
                            </View>

                            {player && (
                              <AnimatedUserMicButton
                                isSelf={isSelf}
                                isBot={Boolean(player.isBot)}
                                isMutedLocally={isSelf ? micMuted : mutedPlayers.has(player.userId)}
                                isRemoteMuted={isSelf ? micMuted : (Boolean(player.isBot) || remoteMicMuted[player.userId] === true)}
                                isSpeaking={speakingUserIds.includes(String(player.userId))}
                                onPress={() => {
                                  if (isSelf) {
                                    handleToggleMic();
                                  } else if (isSelfHost) {
                                    handleHostMuteUser(player.userId, mutedPlayers.has(player.userId));
                                  } else {
                                    toggleMutePlayer(player.userId);
                                  }
                                }}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>

              {/* Bottom 5 Horizontal Player Seat Cards (Image 4) */}
              <View style={{ flexDirection: "row", gap: 14, width: "100%", marginTop: 8 }}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const player = round?.players.find(p => p.seatIndex === idx) || round?.players[idx];
                  const isSelf = player?.userId === user?.id;
                  return (
                    <View
                      key={idx}
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(10, 16, 36, 0.85)",
                        borderRadius: 16,
                        paddingVertical: 20,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: isSelf ? "#FF1744" : player ? "rgba(255, 23, 68, 0.4)" : "rgba(255, 255, 255, 0.08)",
                        alignItems: "center",
                        position: "relative",
                        minHeight: 140,
                        justifyContent: "center",
                      }}
                    >
                      {/* Top Left Number Pill (Image 4) */}
                      <View style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: idx === 0 ? "#FF1744" : "rgba(255, 255, 255, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{idx + 1}</Text>
                      </View>

                      {/* Center Avatar Silhouette */}
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isSelf ? "rgba(255, 23, 68, 0.15)" : player ? "rgba(220, 38, 38, 0.2)" : "rgba(255, 255, 255, 0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}>
                        <Ionicons name="person" size={24} color={isSelf ? "#FF1744" : player ? "#FF5A6E" : "#64748b"} />
                      </View>

                      <Text style={{ color: player ? "#ffffff" : "#64748b", fontSize: 13, fontWeight: "700", textAlign: "center" }} numberOfLines={1}>
                        {player ? (isSelf ? "You" : player.username) : "Waiting for player..."}
                      </Text>
                      <Text style={{ color: player ? "#FF5A6E" : "#475569", fontSize: 11, fontWeight: "600", marginTop: 3 }}>
                        {player ? `${player.stake || 100} ETB` : "Empty Seat"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            /* ════════════════════════════════════════════════════════════════
               ██  RAIL SPIN ROOM LAYOUT (DESKTOP — EXACT MATCH IMAGE 2)
               ════════════════════════════════════════════════════════════════ */
            <View style={{ width: "100%", gap: 20 }}>
              {/* Subheader Row (Image 2) */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                {/* Left: Back button + Title + Badges + Info */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <TouchableOpacity
                    onPress={handleLeaveRoom}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#ffffff" />
                  </TouchableOpacity>

                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "rgba(244, 63, 94, 0.2)",
                    borderWidth: 1,
                    borderColor: "#f43f5e",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="disc" size={24} color="#f43f5e" />
                  </View>

                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                        Endless Spin
                      </Text>
                      <View style={{ backgroundColor: "#DC2626", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>PUBLIC ROOM</Text>
                      </View>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>| Stakes vary | Unlimited players</Text>
                    </View>

                    <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }} activeOpacity={0.8}>
                      <Ionicons name="information-circle-outline" size={13} color="#64748b" />
                      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600" }}>Room Info</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Center: SPIN ENDS IN */}
                <View style={{
                  backgroundColor: "rgba(10, 16, 36, 0.9)",
                  borderRadius: 14,
                  paddingHorizontal: 28,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255, 23, 68, 0.45)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ color: "#8893a7", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>SPIN ENDS IN</Text>
                  <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "Inter, sans-serif", marginTop: 1 }}>
                    {formatCountdown(countdown)}
                  </Text>
                </View>
              </View>

              {/* Three Columns: Column 1 (Bet Card), Column 2 (Wheel & Controls), Column 3 (Players List) */}
              <View style={{ flexDirection: "row", gap: 28, alignItems: "flex-start", width: "100%" }}>
                {/* COLUMN 1: Stakes & Bet Selector (Red Gaming Style) */}
                <View style={{ flex: 1, minWidth: 260 }}>
                  <View style={{
                    backgroundColor: "rgba(10, 16, 36, 0.85)",
                    borderRadius: 20,
                    padding: 22,
                    borderWidth: 1.5,
                    borderColor: "rgba(255, 23, 68, 0.35)",
                  }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <View>
                        <Text style={{ color: "#8893a7", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>
                          YOUR TOTAL STAKE
                        </Text>
                        <Text style={{ color: "#ff1744", fontSize: 28, fontWeight: "900", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                          {(() => {
                            const p = round?.players.find(x => x.userId === user?.id);
                            return p ? p.stake : (round ? 0 : betAmount);
                          })()} ETB
                        </Text>
                      </View>
                      <View style={{
                        alignItems: "flex-end",
                        backgroundColor: "rgba(255, 23, 68, 0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 23, 68, 0.3)",
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}>
                        <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>
                          WALLET
                        </Text>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", fontFamily: "Inter, sans-serif", marginTop: 1 }}>
                          {balance.toLocaleString()} ETB
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "500", marginBottom: 16 }}>
                      Add more money to increase your odds!
                    </Text>

                    {/* Quick chips: +10, +50, +100, +500 (Red Accents) */}
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                      {[10, 50, 100, 500].map((val) => {
                        const isLocking = round && (round.status !== "waiting" || countdown <= 5);
                        const isSelected = round ? addAmount === val : betAmount === val;
                        return (
                          <TouchableOpacity
                            key={val}
                            disabled={Boolean(isLocking)}
                            onPress={() => {
                              playCoinSound();
                              if (round) setAddAmount(val);
                              else setBetAmount(val);
                            }}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 10,
                              backgroundColor: isSelected ? "rgba(255, 23, 68, 0.18)" : "rgba(15, 23, 42, 0.6)",
                              borderWidth: 1,
                              borderColor: isSelected ? "#ff1744" : "rgba(255, 255, 255, 0.08)",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: isLocking ? 0.35 : 1,
                            }}
                          >
                            <Text style={{ color: isSelected ? "#ff1744" : "#94a3b8", fontSize: 12, fontWeight: "800" }}>
                              +{val}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Stepper row: [ - ]  100 ETB  [ + ] (Image 2) */}
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      height: 48,
                      paddingHorizontal: 8,
                      marginBottom: 16,
                    }}>
                      <TouchableOpacity
                        onPress={() => {
                          playCoinSound();
                          if (round) setAddAmount(prev => Math.max(10, prev - 10));
                          else setBetAmount(prev => Math.max(10, prev - 10));
                        }}
                        style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.06)", alignItems: "center", justifyContent: "center" }}
                      >
                        <Ionicons name="remove" size={18} color="#ffffff" />
                      </TouchableOpacity>

                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>
                          {round ? `+${addAmount} ETB` : `${betAmount} ETB`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          playCoinSound();
                          if (round) setAddAmount(prev => Math.min(10000, prev + 10));
                          else setBetAmount(prev => Math.min(10000, prev + 10));
                        }}
                        style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.06)", alignItems: "center", justifyContent: "center" }}
                      >
                        <Ionicons name="add" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>

                    {/* Action Button: [ 💰 ADD TO STAKE ] (Image 2) */}
                    <TouchableOpacity
                      disabled={Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5)))}
                      onPress={() => {
                        playCoinSound();
                        if (round) handleAddStake(addAmount);
                        else handleJoinRoom("RAIL", betAmount);
                      }}
                      style={{
                        backgroundColor: "#f43f5e",
                        borderRadius: 14,
                        height: 50,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: Boolean(addLoading || joinLoading || (round && (round.status !== "waiting" || countdown <= 5))) ? 0.6 : 1,
                      }}
                      activeOpacity={0.85}
                    >
                      {addLoading || joinLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <CoinStackIcon size={18} color="#ffffff" />
                          <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                            {round
                              ? (round.status !== "waiting" || countdown <= 5 ? "LOCKED" : "ADD TO STAKE")
                              : "ADD TO STAKE"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Subrow: Stake vs Balance (matches HTML specification) */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4 }}>
                      <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                        STAKE: <Text style={{ color: "#ffffff", fontWeight: "900" }}>{(() => {
                          const p = round?.players.find(x => x.userId === user?.id);
                          return p ? p.stake : (round ? 0 : betAmount);
                        })()} ETB</Text>
                      </Text>
                      <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700" }}>
                        AVAILABLE: <Text style={{ color: "#22c55e", fontWeight: "900" }}>{balance.toLocaleString()} ETB</Text>
                      </Text>
                    </View>
                  </View>
                </View>

                {/* COLUMN 2: Center Wheel & Voice & Pot & Leave (Image 2) */}
                <View style={{ flex: 1.2, alignItems: "center" }}>
                  <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                    <SpinWheel
                      size={Math.min(screenW * 0.32, 420)}
                      players={round ? round.players : previewPlayers}
                      isSpinning={Boolean(screenState === "spinning" || round?.status === "spinning" || isSpinning)}
                      winningSlice={winningSlice}
                      winnerId={pendingWinnerId || resultData?.winnerId}
                      winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
                      prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
                      spinDuration={spinDuration}
                      onSpinComplete={handleSpinComplete}
                      status={screenState === "result" ? "resolved" : (round ? round.status : "waiting")}
                      mode="RAIL"
                      speakingUserIds={speakingUserIds}
                      countdown={countdown}
                      countdownText={countdown > 0 ? formatCountdown(countdown) : (round?.status === "locked" || round?.status === "spinning" ? "0:00" : "02:00")}
                      currentUserId={user?.id}
                      flashingUserIds={flashingUserIds}
                    />

                    {/* Floating Bet Reaction Badges (PC Desktop Support) */}
                    {reactions.map((r) => (
                      <FloatingBetReactionBadge key={r.id} reaction={r} />
                    ))}
                  </View>

                  {/* Mic & Hear Lobby toggles side-by-side (Image 2) */}
                  <View style={{ flexDirection: "row", gap: 14, marginTop: 18, marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={handleToggleMic}
                      disabled={!round}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: micMuted ? "rgba(244, 63, 94, 0.12)" : "rgba(34, 197, 94, 0.15)",
                        borderWidth: 1,
                        borderColor: micMuted ? "#f43f5e" : "#22c55e",
                        opacity: !round ? 0.4 : 1,
                      }}
                    >
                      <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#f43f5e" : "#22c55e"} />
                      <Text style={{ color: micMuted ? "#f43f5e" : "#22c55e", fontSize: 12, fontWeight: "800" }}>
                        {micMuted ? "Mic Off" : "Mic On"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleToggleSpeaker}
                      disabled={!round}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: masterSpeakerMuted ? "rgba(239, 68, 68, 0.12)" : "rgba(15, 23, 42, 0.8)",
                        borderWidth: 1,
                        borderColor: masterSpeakerMuted ? "#ef4444" : "rgba(255, 255, 255, 0.15)",
                        opacity: !round ? 0.4 : 1,
                      }}
                    >
                      <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={16} color={masterSpeakerMuted ? "#ef4444" : "#ffffff"} />
                      <Text style={{ color: masterSpeakerMuted ? "#ef4444" : "#ffffff", fontSize: 12, fontWeight: "800" }}>
                        {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* CURRENT POT (Crimson / White, no blue/yellow) */}
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                      CURRENT POT
                    </Text>
                    <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 2 }}>
                      {previewPot.toLocaleString()} ETB
                    </Text>
                  </View>

                  {/* LEAVE ROOM (Normal clean button) */}
                  <TouchableOpacity
                    onPress={handleLeaveRoom}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 18,
                      paddingHorizontal: 22,
                      paddingVertical: 9,
                      borderWidth: 1,
                      borderColor: leaveBlocked ? "rgba(244, 63, 94, 0.35)" : "rgba(255, 255, 255, 0.15)",
                      backgroundColor: leaveBlocked ? "rgba(244, 63, 94, 0.08)" : "rgba(255, 255, 255, 0.05)",
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={leaveBlocked ? "lock-closed" : "exit-outline"} size={15} color={leaveBlocked ? "#f43f5e" : "#94a3b8"} />
                    <Text style={{ color: leaveBlocked ? "#f43f5e" : "#94a3b8", fontSize: 12, fontWeight: "500", letterSpacing: 0.2 }}>
                      {leaveBlocked ? (language === "am" ? "ተቆልፏል" : "Leave Locked") : (language === "am" ? "ከክፍሉ ውጣ" : "Leave Room")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* COLUMN 3: Players List (Image 2) */}
                <View style={{ flex: 1.1, minWidth: 280 }}>
                  <View style={{
                    backgroundColor: "rgba(10, 16, 36, 0.85)",
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255, 23, 68, 0.25)",
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="people" size={18} color="#94a3b8" />
                        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 }}>
                          PLAYERS IN ROOM ({round ? round.players.length : 0})
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setInviteModalVisible(true)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(255, 23, 68, 0.16)",
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#FF1744",
                            cursor: "pointer",
                          }}
                        >
                          <Ionicons name="person-add" size={12} color="#FF1744" />
                          <Text style={{ color: "#FF1744", fontSize: 11, fontWeight: "800" }}>
                            {language === "am" ? "+ ጋብዝ" : "+ Invite"}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
                      </View>
                    </View>

                    <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                      {(round ? round.players : []).map((p: any, idx: number) => {
                        const isSelf = p.userId === user?.id;
                        const isHost = idx === 0;
                        const isMuted = mutedPlayers.has(p.userId);
                        const isSelfHost = round?.players[0]?.userId === user?.id;
                        const isSpeaking = Boolean(Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(p.userId)));
                        return (
                          <View
                            key={p.userId || idx}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              backgroundColor: "rgba(15, 23, 42, 0.6)",
                              borderRadius: 14,
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              borderWidth: 1,
                              borderColor: isSelf ? "#FF1744" : "rgba(255, 255, 255, 0.05)",
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: isSelf ? "#FF1744" : "#991B1B",
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900" }}>
                                  {p.username.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                              <View>
                                <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>
                                  {isSelf ? `${p.username} 👑` : p.username}
                                </Text>
                                <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700", marginTop: 1 }}>
                                  {p.stake || 100} ETB
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              {isHost && (
                                <View style={{ backgroundColor: "#FF1744", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>HOST</Text>
                                </View>
                              )}
                              <AnimatedUserMicButton
                                isSelf={isSelf}
                                isBot={Boolean(p.isBot)}
                                isMutedLocally={isSelf ? micMuted : mutedPlayers.has(p.userId)}
                                isRemoteMuted={isSelf ? micMuted : (Boolean(p.isBot) || remoteMicMuted[p.userId] === true)}
                                isSpeaking={speakingUserIds.includes(String(p.userId))}
                                onPress={() => {
                                  if (isSelf) {
                                    handleToggleMic();
                                  } else if (isSelfHost) {
                                    handleHostMuteUser(p.userId, mutedPlayers.has(p.userId));
                                  } else {
                                    toggleMutePlayer(p.userId);
                                  }
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ════════════════════════════════════════════════════════════════
           ██  MOBILE SPIN ROOM LAYOUT (Red background + Crimson accents)
           ════════════════════════════════════════════════════════════════ */
        <ScrollView
          style={{ flex: 1, backgroundColor: "transparent" }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 24,
            justifyContent: "space-between",
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Header Row (Back < on Left, Balance + Language side-by-side in Center, Voice Mic on Right with Gap - Exact Mockup Match) */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 6, position: "relative", zIndex: 10 }}>
            {/* Left Action Button: Back < */}
            <TouchableOpacity
              onPress={handleLeaveRoom}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#0c142e",
                borderWidth: 1.5,
                borderColor: leaveBlocked ? "rgba(239, 68, 68, 0.35)" : "rgba(255, 23, 68, 0.35)",
                alignItems: "center",
                justifyContent: "center",
                opacity: leaveBlocked ? 0.45 : 1,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={22} color={leaveBlocked ? "#94a3b8" : "#ffffff"} />
            </TouchableOpacity>

            {/* Center: Side-by-Side Balance Capsule + Language Switcher */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Wallet Balance Capsule */}
              <TouchableOpacity
                onPress={() => setDepositVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#0c142e",
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  height: 44,
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 23, 68, 0.35)",
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="wallet-outline" size={18} color="#FF1744" />
                <View style={{ alignItems: "flex-start" }}>
                  <Text style={{ color: "#FF1744", fontSize: 8.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>
                    {language === "am" ? "ቀሪ ሂሳብ" : "BALANCE"}
                  </Text>
                  <Text style={{ color: "#ffffff", fontSize: 13.5, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                    {balance.toLocaleString()} ETB
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Language Switcher Circular Button (Matches Back & Mic buttons) */}
              <TouchableOpacity
                onPress={() => switchLanguage()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#0c142e",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 23, 68, 0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="globe-outline" size={20} color="#FF1744" />
              </TouchableOpacity>
            </View>

            {/* Right: Voice Chat Mic Button with Gap */}
            <TouchableOpacity
              onPress={handleToggleMic}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#0c142e",
                borderWidth: 1.5,
                borderColor: micMuted ? "rgba(244, 63, 94, 0.4)" : "rgba(34, 197, 94, 0.4)",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.75}
            >
              <Ionicons name={micMuted ? "mic-off" : "mic"} size={20} color={micMuted ? "#f43f5e" : "#22c55e"} />
            </TouchableOpacity>
          </View>

          {/* Center Spin Wheel Container */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginVertical: isCompactScreen ? 2 : 4, position: "relative" }}>
            <SpinWheel
              size={mobileWheelSize}
              players={round ? round.players : previewPlayers}
              isSpinning={Boolean(screenState === "spinning" || round?.status === "spinning" || isSpinning)}
              winningSlice={winningSlice}
              winnerId={pendingWinnerId || resultData?.winnerId}
              winnerName={resultData?.winnerName || pendingResultDataRef.current?.winnerName}
              prizeAmount={resultData?.prizeAmount || pendingResultDataRef.current?.prizeAmount || previewPot}
              spinDuration={spinDuration}
              onSpinComplete={handleSpinComplete}
              status={screenState === "result" ? "resolved" : (round ? round.status : "waiting")}
              mode={is5Player ? "5_PLAYER" : "RAIL"}
              speakingUserIds={speakingUserIds}
              countdown={countdown}
              countdownText={countdown > 0 ? formatCountdown(countdown) : (round?.status === "locked" || round?.status === "spinning" ? "0:00" : "02:00")}
              currentUserId={user?.id}
              flashingUserIds={flashingUserIds}
            />

            {/* Floating Bet Reaction Badges (Exact Prototype Match) */}
            {reactions.map((r) => (
              <FloatingBetReactionBadge key={r.id} reaction={r} />
            ))}


          </View>

          {/* Docked Floating Total Jackpot Pill (Crimson Red / Slate / Crisp White) */}
          <Animated.View style={{
            transform: [{ scale: ribbonBumpAnim }],
            alignSelf: "center",
            marginVertical: isCompactScreen ? 4 : 8,
            backgroundColor: "rgba(10, 16, 36, 0.94)",
            borderWidth: 1.5,
            borderColor: "rgba(255, 23, 68, 0.45)",
            borderRadius: 30,
            paddingVertical: 8,
            paddingHorizontal: 22,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            shadowColor: "#FF1744",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}>
            <Ionicons name="trophy" size={24} color="#FF1744" />
            <View style={{ alignItems: "center" }}>
              <Text style={{
                color: "#FF1744",
                fontSize: 9.5,
                fontWeight: "900",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}>
                {resultData
                  ? (isMyWin
                      ? (language === "am" ? "አሸንፈዋል!" : "YOU WON!")
                      : `${resultData.winnerName.toUpperCase()} WON!`)
                  : (language === "am" ? "ጠቅላላ ሽልማት" : "TOTAL JACKPOT")}
              </Text>
              <Text style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: "900",
                letterSpacing: 0.5,
                fontFamily: "Space Grotesk, Inter, sans-serif",
                marginTop: 1,
              }}>
                {resultData
                  ? `${resultData.prizeAmount.toLocaleString()} ETB`
                  : (previewPot > 0 ? previewPot.toLocaleString() : "1,000") + " ETB"}
              </Text>
            </View>
          </Animated.View>

          {/* Bottom Controls Area */}
          <View style={{ width: "100%", alignItems: "center", paddingBottom: 4 }}>
            {is5Player ? (
              /* ── 5-PLAYER MODE CONTROLS: Fixed entry + Bordered Joined Players button ── */
              <View style={{ width: "100%", gap: 8 }}>
                {round && round.players.some(p => String(p.userId) === String(user?.id)) ? (
                  <View style={{
                    width: "100%",
                    backgroundColor: "rgba(10, 18, 40, 0.92)",
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: "rgba(0, 218, 243, 0.35)",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
                      <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
                        Waiting for Players ({round.players.length}/5)
                      </Text>
                    </View>
                    <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600" }}>
                      Fixed 100 ETB entry • Round spins automatically when full
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    disabled={Boolean(joinLoading || isSpinning || (round && round.players.length >= 5))}
                    onPress={() => handleJoinRoom("5_PLAYER", 100)}
                    style={{
                      backgroundColor: "#ec4899",
                      borderRadius: 24,
                      height: 50,
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      opacity: Boolean(joinLoading || isSpinning || (round && round.players.length >= 5)) ? 0.7 : 1,
                    }}
                    activeOpacity={0.85}
                  >
                    {joinLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", letterSpacing: 1, fontFamily: "Inter, sans-serif" }}>
                        JOIN GAME (100 ETB)
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Bordered Button to see joined players in 5-Player Mode */}
                <TouchableOpacity
                  onPress={() => setMobilePlayersSheetVisible(true)}
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(10, 18, 40, 0.85)",
                    borderWidth: 1.5,
                    borderColor: "rgba(56, 189, 248, 0.25)",
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="people" size={17} color="#38bdf8" />
                    <Text numberOfLines={1} style={{ color: "#e2e8f0", fontSize: 13, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
                      {language === "am"
                        ? `ተጫዋቾች (${round?.players?.length || 0}/5)`
                        : `View Players (${round?.players?.length || 0}/5)`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            ) : (
              /* ── RAIL MODE CONTROLS: Clean Modern Interface (Exact Mockup Match) ── */
              <View style={{ width: "100%" }}>
                {/* Unified Modern Dark Glass Profile & Bet Card */}
                {(() => {
                  const myPlayer = round?.players?.find(p => String(p.userId) === String(user?.id));
                  const myStake = myPlayer ? Number(myPlayer.stake || 0) : 0;
                  const stepStake = round ? addAmount : betAmount;
                  const displayStake = myStake > 0 ? myStake : stepStake;
                  const potTotal = previewPot > 0 ? previewPot : 1000;
                  const myOdds = Math.min(100, Math.round(((myStake > 0 ? myStake : stepStake) / potTotal) * 100)) || 10;

                  return (
                    <View style={{
                      width: "100%",
                      backgroundColor: "rgba(10, 18, 40, 0.9)",
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: "rgba(255, 23, 68, 0.3)",
                      paddingHorizontal: 16,
                      paddingTop: 12,
                      paddingBottom: 10,
                      marginBottom: 8,
                    }}>
                      {/* Top Row: User Avatar & Name | YOUR BET | PERCENTAGE */}
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        {/* Left: Avatar + GUEST_2 + YOU badge */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1.1, minWidth: 0 }}>
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "rgba(255, 23, 68, 0.15)",
                            borderWidth: 2,
                            borderColor: "#FF1744",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Ionicons name="person" size={20} color="#FF1744" />
                          </View>

                          <View style={{ minWidth: 0, flexShrink: 1 }}>
                            <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                              {user?.username ? user.username.toUpperCase() : "PLAYER"}
                            </Text>
                            <View style={{
                              alignSelf: "flex-start",
                              backgroundColor: "rgba(255, 23, 68, 0.2)",
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: "#FF1744",
                              marginTop: 2,
                            }}>
                              <Text style={{ color: "#FF1744", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 }}>
                                YOU
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Subtle Divider */}
                        <View style={{ width: 1, height: 32, backgroundColor: "rgba(255, 255, 255, 0.12)", marginHorizontal: 4 }} />

                        {/* Middle: YOUR BET */}
                        <View style={{ alignItems: "center", flex: 0.95 }}>
                          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>
                            {language === "am" ? "የእርስዎ ውርርድ" : "YOUR BET"}
                          </Text>
                          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 2 }}>
                            {displayStake} ETB
                          </Text>
                        </View>

                        {/* Subtle Divider */}
                        <View style={{ width: 1, height: 32, backgroundColor: "rgba(255, 255, 255, 0.12)", marginHorizontal: 4 }} />

                        {/* Right: PERCENTAGE */}
                        <View style={{ alignItems: "center", flex: 0.85 }}>
                          <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>
                            {language === "am" ? "መቶኛ" : "PERCENTAGE"}
                          </Text>
                          <Text style={{ color: "#FF1744", fontSize: 16, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif", marginTop: 2 }}>
                            {myOdds}%
                          </Text>
                        </View>
                      </View>

                      {/* Bottom: Crimson Red Progress Bar */}
                      <View style={{ height: 6, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
                        <View style={{
                          width: `${Math.max(4, myOdds)}%`,
                          height: "100%",
                          backgroundColor: "#FF1744",
                          borderRadius: 3,
                        }} />
                      </View>
                    </View>
                  );
                })()}

                {/* Row 2: Stepper Capsule & Compact ADD BET Action Button */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {/* Stepper (Left) - Expanded width & circular minus/plus buttons */}
                  <View style={{
                    flex: 1.35,
                    backgroundColor: "rgba(10, 18, 40, 0.85)",
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: "rgba(255, 23, 68, 0.3)",
                    height: 50,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 5,
                  }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (round) setAddAmount(p => Math.max(10, p - 10));
                        else setBetAmount(p => Math.max(10, p - 10));
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        borderWidth: 1.5,
                        borderColor: "rgba(255, 23, 68, 0.4)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="remove" size={20} color="#FF1744" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "900", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                        {round ? addAmount : betAmount}
                      </Text>
                      <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "800", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                        ETB
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        if (round) setAddAmount(p => Math.min(10000, p + 10));
                        else setBetAmount(p => Math.min(10000, p + 10));
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        borderWidth: 1.5,
                        borderColor: "rgba(255, 23, 68, 0.4)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={20} color="#FF1744" />
                    </TouchableOpacity>
                  </View>

                  {/* Primary CTA (Right) - Signal Red ADD BET Button */}
                  <TouchableOpacity
                    disabled={joinLoading || addLoading || isSpinning}
                    onPress={() => {
                      if (round) handleAddStake(addAmount);
                      else handleJoinRoom("RAIL", betAmount);
                    }}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 24,
                      backgroundColor: "#FF1744",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      opacity: joinLoading || addLoading || isSpinning ? 0.7 : 1,
                    }}
                    activeOpacity={0.85}
                  >
                    {joinLoading || addLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="layers" size={19} color="#ffffff" />
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                          {language === "am" ? "ውርርድ ጨምር" : "ADD BET"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Row 3: Proper Bordered Button to view joined players */}
                <TouchableOpacity
                  onPress={() => setMobilePlayersSheetVisible(true)}
                  style={{
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(10, 18, 40, 0.85)",
                    borderWidth: 1.5,
                    borderColor: "rgba(255, 23, 68, 0.3)",
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="people" size={17} color="#FF1744" />
                    <Text numberOfLines={1} style={{ color: "#e2e8f0", fontSize: 13, fontWeight: "800", fontFamily: "Space Grotesk, Inter, sans-serif" }}>
                      {language === "am"
                        ? `ተጫዋቾች (${round?.players?.length || 0})`
                        : `View Players (${round?.players?.length || 0})`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#FF1744" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}



      {/* ════════════════════════════════════════════════════════════════
         ██  WINNER / LOSER POPUP OVERLAY (Exact Match Image 4)
         ════════════════════════════════════════════════════════════════ */}
      {screenState === "result" && resultData && (
        <View style={ds.overlayBackdrop}>
          <SpinResultModal
            isMyWin={isMyWin}
            prizeAmount={isMyWin ? Number(resultData.prizeAmount || 0) : 0}
            userBet={round ? (round.players.find(p => String(p.userId) === String(user?.id))?.stake || betAmount) : betAmount}
            totalPrizePool={
              Number(resultData?.prizeAmount ? Math.round(Number(resultData.prizeAmount) / 0.8) : 0) ||
              Number(round?.pot || 0) ||
              (round?.players ? round.players.reduce((sum, p) => sum + (Number(p.stake) || 0), 0) : 0) ||
              (betAmount * (is5Player ? 5 : 2))
            }
            language={language}
            handlePlayAgain={handlePlayAgain}
            onLeave={() => {
              voiceService.leaveChannel();
              resultShownRoundIdRef.current = null;
              setScreenState("browse");
              setRound(null);
              setIsSpinning(false);
              setWinningSlice(null);
              setPendingWinnerId(null);
              pendingSpinDataRef.current = null;
              setResultData(null);
              setCountdown(0);
              refreshProfile();
              router.replace("/(authed)/home/gameplay");
            }}
          />
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
         ██  MOBILE PLAYERS BOTTOM SHEET DRAWER (Exact Match Image 3)
         ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={mobilePlayersSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMobilePlayersSheetVisible(false)}
      >
        <View style={ds.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMobilePlayersSheetVisible(false)} />

          <View style={{
            backgroundColor: "#0c1022",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
            paddingHorizontal: 20,
            paddingBottom: 34,
            paddingTop: 12,
            width: "100%",
            maxHeight: "75%",
          }}>
            {/* Top Grab Handle */}
            <TouchableOpacity
              onPress={() => setMobilePlayersSheetVisible(false)}
              style={{ alignItems: "center", paddingVertical: 4, marginBottom: 12 }}
              activeOpacity={0.8}
            >
              <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.25)" }} />
            </TouchableOpacity>

            {/* Players Header with chevron + General Mute (Image 1 spec: speaker inside drawer) */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4 }}>
              <TouchableOpacity
                onPress={() => setMobilePlayersSheetVisible(false)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
                  PLAYERS ({sortedPlayers.length})
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {/* INVITE BUTTON (Exact Red Arrow Placement in Image 1!) */}
                <TouchableOpacity
                  onPress={() => {
                    setMobilePlayersSheetVisible(false);
                    setInviteModalVisible(true);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(255, 23, 68, 0.15)",
                    borderWidth: 1.5,
                    borderColor: "#FF1744",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 18,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={15} color="#FF1744" />
                  <Text style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "900", letterSpacing: 0.5 }}>
                    {language === "am" ? "ጋብዝ" : "INVITE"}
                  </Text>
                </TouchableOpacity>

                {/* General Mute / Speaker button (moved from top bar) */}
                <TouchableOpacity
                  onPress={handleToggleSpeaker}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: masterSpeakerMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(15, 23, 42, 0.75)",
                    borderWidth: 1,
                    borderColor: masterSpeakerMuted ? "#ef4444" : "rgba(255, 255, 255, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={18} color={masterSpeakerMuted ? "#ef4444" : "#ffffff"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sorted Players List (High stake to low stake) */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {sortedPlayers.map((p: any, idx: number) => {
                const isSelf = p.userId === user?.id;
                const isMuted = mutedPlayers.has(p.userId);
                const isSelfHost = round?.players[0]?.userId === user?.id;
                const isSpeaking = Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(p.userId));

                // Avatar Colors: Self is crimson #FF1744, others cycle deep reds and accents
                const otherColors = ["#DC2626", "#B91C1C", "#991B1B", "#E11D48", "#EA580C"];
                const avatarBg = isSelf ? "#f43f5e" : otherColors[idx % otherColors.length];
                const rawName = p.username || "Player";
                const cleanName = isSelf ? "You" : (rawName.split(" ")[0].split("_")[0]);

                return (
                  <View
                    key={p.userId || idx}
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.85)",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      {/* Avatar Circle */}
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="person" size={22} color="#ffffff" />
                      </View>

                      {/* Name & Stake Column */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>
                            {cleanName}
                          </Text>
                          {isSpeaking && <SpeakingWaveAnimation />}
                        </View>
                        <Text style={{ color: "#facc15", fontSize: 13, fontWeight: "800", marginTop: 2 }}>
                          {p.stake || 10} ETB {(() => {
                            const totalStk = sortedPlayers.reduce((acc: number, item: any) => acc + Number(item.stake || 10), 0);
                            const pct = is5Player ? 20 : (totalStk > 0 ? Math.round(((p.stake || 10) / totalStk) * 100) : 0);
                            return pct > 0 ? `• ${pct}%` : "";
                          })()}
                        </Text>
                      </View>
                    </View>

                    {/* Microphone Icon Button on right (Pulsing green when speaking/on, grey when muted, click to mute) */}
                    <AnimatedUserMicButton
                      isSelf={isSelf}
                      isBot={Boolean(p.isBot)}
                      isMutedLocally={isSelf ? micMuted : mutedPlayers.has(p.userId)}
                      isRemoteMuted={isSelf ? micMuted : (Boolean(p.isBot) || remoteMicMuted[p.userId] === true)}
                      isSpeaking={isSpeaking}
                      onPress={() => {
                        if (isSelf) {
                          handleToggleMic();
                        } else if (isSelfHost) {
                          handleHostMuteUser(p.userId, mutedPlayers.has(p.userId));
                        } else {
                          toggleMutePlayer(p.userId);
                        }
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
         ██  ROOM RULES & FAIR PLAY MODAL (#)
         ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showRulesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(3, 7, 18, 0.82)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRulesModal(false)} />

          <View style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#0b1126",
            borderRadius: 26,
            borderWidth: 1.5,
            borderColor: "rgba(255, 23, 68, 0.45)",
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 22,
            shadowColor: "#FF1744",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
            zIndex: 10,
          }}>
            {/* Header: Title & Close Button */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "rgba(250, 204, 21, 0.15)",
                  borderWidth: 1.5,
                  borderColor: "#facc15",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="trophy" size={20} color="#facc15" />
                </View>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>
                    {language === "am" ? "የጨዋታ ህጎች" : "HOW TO PLAY"}
                  </Text>
                  <Text style={{ color: "#FF5A6E", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>
                    {language === "am" ? "ፍትሃዊ እና ግልጽ ጨዋታ" : "FAIR PLAY & REWARDS"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowRulesModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Rules Cards List */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              {[
                {
                  icon: "disc",
                  color: "#FF1744",
                  title: language === "am" ? "1. የእርስዎን ድርሻ ይያዙ" : "1. Claim Your Slice",
                  desc: language === "am" ? "ውርርድ በማስገባት በስፒን ጎማው ላይ የራስዎ ቦታ ያግኙ።" : "Place your bet in ETB to secure your slice on the live wheel."
                },
                {
                  icon: "pie-chart",
                  color: "#a855f7",
                  title: language === "am" ? "2. ተመጣጣኝ የማሸነፍ እድል" : "2. Proportional Winning Odds",
                  desc: language === "am" ? "ውርርድዎ በጨመረ ቁጥር የጎማው ድርሻዎ እና የማሸነፍ እድልዎ ይሰፋል!" : "The bigger your bet, the larger your slice and higher your chance of winning!"
                },
                {
                  icon: "time",
                  color: "#f59e0b",
                  title: language === "am" ? "3. የቀጥታ ስፒን እና ቆጣሪ" : "3. Live Countdown & Spin",
                  desc: language === "am" ? "ቆጣሪው 0:00 ሲደርስ ጎማው በይፋ ይሽከረከራል፤ ቀዩ ጠቋሚ ባረፈበት አሸናፊው ይለያል።" : "When the timer reaches 0:00, the wheel spins and the top red pointer picks the winner."
                },
                {
                  icon: "cash",
                  color: "#10b981",
                  title: language === "am" ? "4. ፈጣን ሽልማት ክፍያ" : "4. Instant Wallet Payout",
                  desc: language === "am" ? "አሸናፊው 20% የአገልግሎት ክፍያ ተቀንሶ ጠቅላላ ገንዳውን ወዲያው ወደ ቦርሳው ይወስዳል!" : "Winner receives the entire prize pool (minus 20% house fee) credited instantly!"
                },
              ].map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    padding: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: `${item.color}20`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800", fontFamily: "Inter, sans-serif" }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 11.5, fontWeight: "500", marginTop: 2, lineHeight: 16 }}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => setShowRulesModal(false)}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 24,
                backgroundColor: "#DC2626",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#FF1744",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
                {language === "am" ? "ተረድቻለሁ • እንጫወት!" : "GOT IT • LET'S PLAY!"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
         ██  INVITE FRIENDS MODAL (Exact Image 3 Spec)
         ════════════════════════════════════════════════════════════════ */}
      <InviteFriendsModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        mode={is5Player ? "5_PLAYER" : "RAIL"}
        entryAmount={is5Player ? 100 : (round ? addAmount : betAmount)}
      />

      {/* ════════════════════════════════════════════════════════════════
         ██  INCOMING REAL-TIME SPIN INVITATION MODAL
         ════════════════════════════════════════════════════════════════ */}
      <IncomingSpinInviteModal
        invite={incomingSpinInvite}
        onAccept={handleAcceptSpinInvite}
        onDecline={handleDeclineSpinInvite}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0e1a" },
  // ── Header ──
  header: {
    backgroundColor: "#0f1324",
    borderBottomWidth: 1,
    borderBottomColor: "#1e2340",
    paddingHorizontal: 24,
    paddingVertical: 10,
    zIndex: 100,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 1600,
    alignSelf: "center",
    width: "100%",
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoImg: { width: 34, height: 34, borderRadius: 8 },
  logoText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1, fontFamily: "Inter, sans-serif" },
  toggleWrap: { flexDirection: "row", backgroundColor: "#141829", borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: "#8b5cf6" },
  toggleText: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 1, fontFamily: "Inter, sans-serif" },
  toggleTextActive: { color: "#fff" },
  utilCluster: { flexDirection: "row", alignItems: "center", gap: 12 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141829",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceLabel: { color: "#8b93a7", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  refreshBalBtn: { padding: 4 },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141829",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  profileName: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  // ── Body ──
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingVertical: 20, maxWidth: 1600, alignSelf: "center", width: "100%" },
  mainRow: { flexDirection: "row", gap: 24 },
  // ── Left sidebar ──
  leftSidebar: { width: 260, gap: 12 },
  card: {
    backgroundColor: "#141829",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  userHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  userName: { color: "#fff", fontSize: 14, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  onlineText: { color: "#22c55e", fontSize: 10, fontWeight: "700" },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: "relative",
  },
  navItemActive: { backgroundColor: "rgba(139, 92, 246, 0.08)" },
  navActiveBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: "#8b5cf6",
  },

  navText: { color: "#8b93a7", fontSize: 13, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  navTextActive: { color: "#fff" },
  sectionLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: "Inter, sans-serif",
  },
  walletBtns: { flexDirection: "row", gap: 8 },
  walletBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  walletBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  // ── Center column ──
  centerColumn: { flex: 1 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { color: "#ef4444", fontSize: 13, fontWeight: "700", flex: 1, fontFamily: "Inter, sans-serif" },
  // ── Waiting state ──
  waitingContainer: { flex: 1 },
  waitingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  waitingTitle: { color: "#fff", fontSize: 24, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  waitingSubtitle: { color: "#8b93a7", fontSize: 13, fontWeight: "600", marginTop: 2, fontFamily: "Inter, sans-serif" },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 182, 66, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 182, 66, 0.3)",
  },
  countdownText: { color: "#f5b642", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" },
  wheelCenter: { alignItems: "center", paddingVertical: 24 },
  playerSlots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  playerSlot: {
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2340",
    backgroundColor: "#141829",
    minWidth: 100,
  },
  slotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e2340",
    alignItems: "center",
    justifyContent: "center",
  },
  slotAvatarText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  slotName: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  potInfo: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e2340",
  },
  potLabel: { color: "#8b93a7", fontSize: 10, fontWeight: "800", letterSpacing: 1, fontFamily: "Inter, sans-serif" },
  potValue: { color: "#22c55e", fontSize: 28, fontWeight: "900", marginTop: 4, fontFamily: "Inter, sans-serif" },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 9,
    marginTop: 16,
  },
  leaveBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "500", letterSpacing: 0.2, fontFamily: "Inter, sans-serif" },
  joinBtn5P: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: "#f43f5e",
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#f43f5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  joinBtn5PText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  // ── Spinning & Result ──
  spinningContainer: { flex: 1, alignItems: "center" },
  spinningTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Inter, sans-serif",
  },
  resultCard: {
    backgroundColor: "#141829",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2340",
    marginTop: 24,
    minWidth: 300,
  },
  resultCardWin: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },
  resultLabel: { color: "#8b93a7", fontSize: 12, fontWeight: "800", letterSpacing: 1, fontFamily: "Inter, sans-serif" },
  resultName: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 8, fontFamily: "Inter, sans-serif" },
  resultPrize: { color: "#f5b642", fontSize: 32, fontWeight: "900", marginTop: 8, fontFamily: "Inter, sans-serif" },
  playAgainBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 20,
  },
  playAgainText: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 1, fontFamily: "Inter, sans-serif" },
  voiceControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#141829",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2340",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  voiceControlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#1e2340",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  voiceControlBtnText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  slotActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1e2340",
    alignItems: "center",
    justifyContent: "center",
  },
  speakingIndicator: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // ── 5P & Rail Custom layout ──
  twoColumnRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 24,
    width: "100%",
  },
  threeColumnRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 24,
    width: "100%",
  },
  mainColumn5P: {
    flex: 1.8,
    gap: 16,
  },
  sidebar5P: {
    flex: 1,
    minWidth: 280,
  },
  betSelectorColumn: {
    flex: 1,
    minWidth: 260,
  },
  wheelCenterColumn: {
    flex: 1.5,
    alignItems: "center",
    gap: 16,
  },
  playersListColumn: {
    flex: 1,
    minWidth: 280,
  },
  rightSidebarPanel: {
    backgroundColor: "#141829",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  playerSeatCard: {
    width: Platform.OS === "web" ? "18%" : "47%",
    backgroundColor: "#141829",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2340",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  seatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  seatAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  seatName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  seatStake: {
    color: "#FF5A6E",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  seatCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  publicPill: {
    backgroundColor: "rgba(255, 23, 68, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 23, 68, 0.35)",
  },
  publicPillText: {
    color: "#FF5A6E",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  roomInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  roomInfoBtnText: {
    color: "#8b93a7",
    fontSize: 12,
    fontWeight: "600",
  },
  betCard: {
    backgroundColor: "#141829",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  betCardLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  betCardVal: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginVertical: 6,
  },
  betLimits: {
    color: "#4b5563",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1324",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  stepperBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#1e2340",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperInput: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  presetChips: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "#0f1324",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  presetChipActive: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  presetChipText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
  },
  presetChipTextActive: {
    color: "#a78bfa",
  },
  placeBetBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  placeBetBtnDisabled: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderWidth: 1,
  },
  placeBetBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  countdownBox: {
    backgroundColor: "#141829",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#1e2340",
    alignItems: "center",
    width: 160,
  },
  countdownLabel: {
    color: "#8b93a7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  countdownTime: {
    color: "#f5b642",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  potBox: {
    alignItems: "center",
    marginBottom: 8,
  },
  potBoxLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  potBoxVal: {
    color: "#22c55e",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2340",
  },
  playerName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  playerSubStake: {
    color: "#8b93a7",
    fontSize: 10,
    marginTop: 1,
  },
  playerRowStake: {
    color: "#FF5A6E",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 12,
  },
  moderateMicBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  leaderboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leaderboardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2340",
  },
  leaderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  leaderBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  leaderDetails: {
    flex: 1,
  },
  leaderName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  leaderVal: {
    color: "#8b93a7",
    fontSize: 10,
    marginTop: 1,
  },
  standingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f1324",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1e2340",
  },
  standingsBtnText: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  celebrationOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  celebrationCard: {
    backgroundColor: "#141829",
    borderRadius: 24,
    padding: 30,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  celebrationCardWin: {
    borderColor: "#FF1744",
    backgroundColor: "#160b14",
  },
  celebrationCardLose: {
    borderColor: "#1e2340",
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: "center",
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FF1744",
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  celebrationSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Inter, sans-serif",
  },
  celebrationPrizeBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "#1e2340",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginVertical: 20,
    alignItems: "center",
    width: "100%",
  },
  celebrationPrizeLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  celebrationPrizeVal: {
    color: "#22c55e",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
    fontFamily: "Inter, sans-serif",
  },
  celebrationShareText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Inter, sans-serif",
  },
  celebrationCloseBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 36,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  celebrationCloseBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  playerBet: {
    color: "#FF5A6E",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  hostBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  hostBadgeText: {
    color: "#a78bfa",
    fontSize: 9,
    fontWeight: "800",
  },
  // ── Overlay styles ──
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  countdownOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  countdownOverlayNumber: {
    color: "#fff",
    fontSize: 120,
    fontWeight: "900",
    textShadowColor: "rgba(139, 92, 246, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
    fontFamily: "Inter, sans-serif",
  },
  countdownOverlayLabel: {
    color: "#8b93a7",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    fontFamily: "Inter, sans-serif",
  },
  resultPopup: {
    backgroundColor: "#141829",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1e2340",
    padding: 32,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  resultIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "Inter, sans-serif",
  },
  resultWinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  resultWinnerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  resultWinnerLabel: {
    color: "#8b93a7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  resultPrizeBox: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  resultPrizeLabel: {
    color: "#8b93a7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "Inter, sans-serif",
  },
  resultPrizeAmount: {
    color: "#22c55e",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 4,
    fontFamily: "Inter, sans-serif",
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  resultPlayAgainBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    paddingVertical: 14,
  },
  resultPlayAgainText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },
  resultLeaveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    paddingVertical: 14,
  },
  resultLeaveText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif",
  },

  // ── Mobile User Avatars & Bottom Sheet Drawer Styles ──
  userAvatarsBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(20, 26, 48, 0.8)",
    borderWidth: 1.5,
    borderColor: "#2a3458",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
  },
  userAvatarChipCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  drawerCard: {
    backgroundColor: "#0d1120",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: "#1f2744",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerHandleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  drawerHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  drawerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 14,
    fontFamily: "Inter, sans-serif",
  },
  drawerPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 26, 48, 0.75)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e2646",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  drawerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerPlayerName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Inter, sans-serif",
  },
  drawerPlayerStake: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    fontFamily: "Inter, sans-serif",
  },
  drawerMicBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBottomClose: {
    alignItems: "center",
    paddingTop: 12,
  },
});
