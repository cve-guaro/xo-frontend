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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL, AGORA_APP_ID } from "../../../config";
import SpinWheel from "../../../components/game/SpinWheel";
import { SlidingNumber } from "../../../components/game/SlidingNumber";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import { voiceService } from "../../../lib/voiceService";
import { useAudioPlayer } from "expo-audio";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";

// ── Celebration Confetti Rain Animation (Top to Bottom) ────────────────────
function CelebrationConfetti() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const particles = useMemo(() => {
    const colors = ["#f5b642", "#22d3ee", "#a855f7", "#22c55e", "#ef4444", "#ec4899", "#ffffff", "#fde047"];
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * screenW,
      size: Math.random() * 10 + 6,
      color: colors[i % colors.length],
      duration: Math.random() * 2400 + 1600,
      delay: Math.random() * 1200,
      anim: new Animated.Value(0),
    }));
  }, [screenW]);

  useEffect(() => {
    particles.forEach(p => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, {
            toValue: 1,
            duration: p.duration,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      ).start();
    });
  }, [particles]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map(p => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, screenH + 60],
        });
        const rotate = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "720deg"],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.85, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              width: p.size,
              height: p.size * 1.5,
              backgroundColor: p.color,
              borderRadius: p.size > 10 ? p.size / 2 : 2,
              transform: [{ translateY }, { rotate }],
              opacity,
            }}
          />
        );
      })}
    </View>
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

function SpeakingWaveAnimation() {
  const bar1 = React.useRef(new Animated.Value(3)).current;
  const bar2 = React.useRef(new Animated.Value(12)).current;
  const bar3 = React.useRef(new Animated.Value(6)).current;

  React.useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar1, { toValue: 14, duration: 240, useNativeDriver: false }),
        Animated.timing(bar1, { toValue: 3, duration: 240, useNativeDriver: false }),
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar2, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(bar2, { toValue: 16, duration: 200, useNativeDriver: false }),
      ])
    );
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.timing(bar3, { toValue: 12, duration: 280, useNativeDriver: false }),
        Animated.timing(bar3, { toValue: 2, duration: 280, useNativeDriver: false }),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [bar1, bar2, bar3]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 16, gap: 2, marginLeft: 6 }}>
      <Animated.View style={{ width: 3, height: bar1, backgroundColor: "#22c55e", borderRadius: 1.5 }} />
      <Animated.View style={{ width: 3, height: bar2, backgroundColor: "#22c55e", borderRadius: 1.5 }} />
      <Animated.View style={{ width: 3, height: bar3, backgroundColor: "#22c55e", borderRadius: 1.5 }} />
    </View>
  );
}

export default function SpinGameScreen() {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const { token, user, refreshProfile } = useAuth();
  const balance = Number(user?.available_balance || 0);
  const { mode, stake } = useLocalSearchParams();
  const { ensureConnected, emitAck, onMessage, send } = useSocket();

  const { isPlaying: bgMusicPlaying } = useBackgroundMusic();

  // ---------- Sound Effects ----------
  const clickSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));
  const winSound = useAudioPlayer(require("../../../assets/sounds/win.mp3"));
  const loseSound = useAudioPlayer(require("../../../assets/sounds/lose.wav"));
  const spinLoopSound = useAudioPlayer(require("../../../assets/sounds/spin.mp3"));
  const addMoneySound = useAudioPlayer(require("../../../assets/sounds/add_money.mp3"));

  const playClick = useCallback(() => {
    if (!bgMusicPlaying) return;
    try { clickSound.play(); } catch (e) { console.warn("clickSound error:", e); }
  }, [bgMusicPlaying, clickSound]);

  const playWin = useCallback(() => {
    try { winSound.play(); } catch (e) { console.warn("winSound error:", e); }
  }, [winSound]);

  const playLose = useCallback(() => {
    try { loseSound.play(); } catch (e) { console.warn("loseSound error:", e); }
  }, [loseSound]);

  const playSpinLoop = useCallback(() => {
    try {
      spinLoopSound.loop = true;
      spinLoopSound.play();
    } catch (e) { console.warn("spinLoopSound error:", e); }
  }, [spinLoopSound]);

  const stopSpinLoop = useCallback(() => {
    try {
      spinLoopSound.pause();
      spinLoopSound.currentTime = 0;
    } catch (e) { console.warn("stopSpinLoop error:", e); }
  }, [spinLoopSound]);

  const handleSpinComplete = useCallback(() => {
    stopSpinLoop();
    setScreenState(prev => (prev === "spinning" ? "result" : prev));
  }, [stopSpinLoop]);

  const stopAllSounds = useCallback(() => {
    try { spinLoopSound.pause(); spinLoopSound.currentTime = 0; } catch (e) {}
    try { winSound.pause(); } catch (e) {}
    try { loseSound.pause(); } catch (e) {}
    try { addMoneySound.pause(); } catch (e) {}
  }, [spinLoopSound, winSound, loseSound, addMoneySound]);

  const playAddMoney = useCallback(() => {
    try { addMoneySound.play(); } catch (e) { console.warn("addMoneySound error:", e); }
  }, [addMoneySound]);

  // ── State ────────────────────────────────────────────────────────────
  const [screenState, setScreenState] = useState<ScreenState>("browse");
  const [round, setRound] = useState<RoundState | null>(null);
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
  const [addAmount, setAddAmount] = useState(10);
  const [addLoading, setAddLoading] = useState(false);
  const [mobilePlayersSheetVisible, setMobilePlayersSheetVisible] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [preSpinCountdown, setPreSpinCountdown] = useState<number | null>(null);
  const preSpinTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  // ── Rematch State ──────────────────────────────────────────────
  const [rematchAvailable, setRematchAvailable] = useState<{ originalRoundId: string; timeoutMs: number; betAmount: number } | null>(null);
  const [rematchAccepted, setRematchAccepted] = useState<boolean>(false);
  const [rematchCount, setRematchCount] = useState<number>(0);

  // ── Voice Chat State ───────────────────────────────────────────
  const [micMuted, setMicMuted] = useState(true);
  const [betAmount, setBetAmount] = useState(100);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [preJoinRoom, setPreJoinRoom] = useState<any | null>(null);
  const [mutedPlayers, setMutedPlayers] = useState<Set<string>>(new Set());
  const [masterSpeakerMuted, setMasterSpeakerMuted] = useState(false);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);

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
      } else {
        next.add(targetUserId);
      }
      voiceService.muteRemoteUser(targetUserId, nextMuted);
      return next;
    });
  }, []);

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
  // If the game gets stuck (e.g. socket disconnected during spin), auto-recover
  useEffect(() => {
    if (screenState !== "spinning" && screenState !== "waiting") return;

    const stuckTimeout = setTimeout(() => {
      if (screenState === "spinning") {
        // Stuck in spinning for 20s — force recover
        console.warn("[SPIN] Stuck in spinning state, auto-recovering...");
        stopSpinLoop();
        setIsSpinning(false);
        setScreenState("browse");
        setRound(null);
        setWinningSlice(null);
        setResultData(null);
        setError("Connection lost during spin. Please try again.");
        refreshProfile();
      }
    }, 20000);

    return () => clearTimeout(stuckTimeout);
  }, [screenState, stopSpinLoop, refreshProfile]);

  // ── Socket message handler ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onMessage((msg) => {
      const { type, payload } = msg;

      switch (type) {
        case "spin:player_joined":
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
          // Server countdown takes priority — sync target end timestamp smoothly
          const sec = payload.secondsLeft;
          const newTarget = Date.now() + sec * 1000;
          if (!targetEndTimeRef.current || Math.abs(newTarget - targetEndTimeRef.current) > 1500) {
            targetEndTimeRef.current = newTarget;
          }
          const rem = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
          setCountdown(rem);
          break;
        }

        case "spin:locked":
          setRound(prev => {
            if (prev && prev.roundId !== payload.roundId) return prev;
            return {
              ...(prev || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL", players: payload.players || [] }),
              status: "locked",
              pot: payload.pot,
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
          // Clear pre-spin countdown if still running
          if (preSpinTimerRef.current) {
            clearInterval(preSpinTimerRef.current);
            preSpinTimerRef.current = null;
          }
          setPreSpinCountdown(null);
          setIsSpinning(true);
          setWinningSlice(payload.winningSlice);
          setSpinDuration(payload.spinDuration || 5000);
          setScreenState("spinning");
          setRound(prev => {
            if (prev && prev.roundId !== payload.roundId) return prev;
            playSpinLoop();
            return {
              ...(prev || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL", players: [] }),
              status: "spinning",
            } as RoundState;
          });
          break;

        case "spin:result":
          stopSpinLoop();
          setRound(prev => {
            if (prev && prev.roundId !== payload.roundId) return prev;
            setResultData({
              winnerId: payload.winnerId,
              winnerName: payload.winnerName,
              prizeAmount: payload.prizeAmount,
            });
            setScreenState("result");
            // Only play win/lose sound if user was actually in this active round
            const isUserInRound = prev?.players.some(p => p.userId === user?.id);
            if (isUserInRound) {
              if (payload.winnerId === user?.id) {
                playWin();
              } else {
                playLose();
              }
            }
            return {
              ...(prev || { roundId: payload.roundId, configId: 0, betAmount: 10, maxPlayers: 5, roomName: "Spin Room", countdown: 0, mode: "RAIL", players: [] }),
              status: "resolved",
            } as RoundState;
          });
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
          setResultData(null);
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
          setError(payload.message || "Something went wrong");
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

  // ── Join room handler ────────────────────────────────────────────────
  const handleJoinRoom = useCallback(async (roomMode: string, stakeVal?: number) => {
    setJoinLoading(true);
    setError(null);

    try {
      const connected = await ensureConnected(token || undefined);
      if (!connected) {
        setError("Connection failed. Please try again.");
        return;
      }

      const result = await emitAck("spin:join", { mode: roomMode, stake: stakeVal, token });
      
      if (result.ok && result.data) {
        const state = result.data as RoundState;
        setRound(state);
        const serverCountdown = state.countdown || 0;
        setCountdown(serverCountdown);
        setScreenState("waiting");
        setIsSpinning(false);
        setWinningSlice(null);
        setResultData(null);

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
              // Resilient fallback: trigger spin if timer expires
              setIsSpinning(true);
              setScreenState("spinning");
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
      setError(err.message || "Failed to join room");
    } finally {
      setJoinLoading(false);
    }
  }, [ensureConnected, emitAck, token, user]);

  // Keep a ref to the current round so cleanup can access it without stale closure
  const roundRef = useRef<RoundState | null>(null);
  useEffect(() => { roundRef.current = round; }, [round]);
  const joinAttemptedRef = useRef(false);

  // ── Auto-join room when screen comes into focus & cleanup audio on leave ──
  useFocusEffect(
    useCallback(() => {
      if (!joinAttemptedRef.current) {
        if (mode === "5_PLAYER" && !roundRef.current) {
          joinAttemptedRef.current = true;
          handleJoinRoom("5_PLAYER");
        } else if (mode === "RAIL" && stake && !roundRef.current) {
          joinAttemptedRef.current = true;
          handleJoinRoom("RAIL", Number(stake));
        }
      }

      return () => {
        // Immediate silence + server leave when navigating away
        stopAllSounds();
        voiceService.leaveChannel();
        stopRecording();
        if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
        const currentRound = roundRef.current;
        if (currentRound) {
          emitAck("spin:leave", { roundId: currentRound.roundId, token }).catch(() => {});
        }
        joinAttemptedRef.current = false;
      };
    }, [mode, stake, handleJoinRoom, stopAllSounds, stopRecording, emitAck, token])
  );

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
  const handleLeaveRoom = useCallback(() => {
    setShowLeaveConfirm(true);
  }, []);

  // ── Spin complete handler ────────────────────────────────────────────
  const handleSpinComplete = useCallback(() => {
    // Animation done — result will come from server
    setIsSpinning(false);
  }, []);

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

  const handleAddStake = useCallback(async (amount: number) => {
    setAddLoading(true);
    setError(null);
    try {
      const currentRoundId = roundRef.current?.roundId;
      const result = await emitAck("spin:add_stake", { amount, roundId: currentRoundId, token });
      if (result.ok) {
        // Handled via spin:stake_updated event
        playAddMoney();
      } else {
        setError(result.error === "INSUFFICIENT_BALANCE" ? "Not enough balance. Deposit first!" : (result.error || "Failed to add stake"));
      }
    } catch (e: any) {
      setError(e.message || "Failed to add stake");
    } finally {
      setAddLoading(false);
    }
  }, [emitAck, token, playAddMoney]);

  const handleToggleMic = useCallback(async () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    await voiceService.setMute(nextMuted);
  }, [micMuted]);

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

  const is5Player = round?.mode === "5_PLAYER" || mode === "5_PLAYER";
  const isRail = round?.mode === "RAIL" || mode === "RAIL";

  const previewPlayers = React.useMemo(() => {
    if (round) return round.players;
    const base: SpinPlayer[] = [];
    if (user?.id) {
      base.push({
        userId: user.id,
        username: user.username || "You",
        seatIndex: 0,
        stake: betAmount,
      });
    }
    return base;
  }, [round, user?.id, user?.username, betAmount]);

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

  const previewPot = React.useMemo(() => {
    if (round) return round.pot;
    const roomBet = preJoinRoom?.betAmount || betAmount;
    const roomCount = typeof preJoinRoom?.currentPlayers === "number" ? preJoinRoom.currentPlayers : 0;
    return (roomCount * roomBet) + betAmount;
  }, [round, preJoinRoom?.currentPlayers, preJoinRoom?.betAmount, betAmount]);

  const isMyWin = resultData?.winnerId === user?.id;
  const wheelSize = isDesktop ? Math.min(screenW * 0.32, 400) : Math.min(screenW * 0.86, 330);

  // ══════════════════════════════════════════════════════════════════════
  // ██  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <View style={ds.root}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0a0e1a" }]} />

      {/* Modals */}
      <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />

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

      {/* ── HEADER ── */}
      {isDesktop && (
        <View style={ds.header}>
          <View style={ds.headerInner}>
            {/* Logo */}
            <TouchableOpacity onPress={() => handleNavClick("home")} style={ds.logoWrap} activeOpacity={0.85}>
              <Image source={require("../../../assets/images/icon.jpg")} style={ds.logoImg} />
              <Text style={ds.logoText}>XO ETHIOPIA</Text>
            </TouchableOpacity>



            {/* Right: Profile */}
            <View style={ds.utilCluster}>
              <TouchableOpacity onPress={() => handleNavClick("profile")} style={ds.profileChip} activeOpacity={0.85}>
                <View style={ds.profileAvatar}>
                  <Text style={ds.profileAvatarText}>
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}
                  </Text>
                </View>
                <Text style={ds.profileName}>{user?.username || "Player"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── MAIN BODY ── */}
      {isDesktop ? (
        <ScrollView style={ds.body} contentContainerStyle={ds.bodyContent} showsVerticalScrollIndicator={false}>
          {is5Player ? (
            /* ════════════════════════════════════════════════════════════════
               ██  5-PLAYER SPIN ROOM LAYOUT (DESKTOP)
               ════════════════════════════════════════════════════════════════ */
            <View style={ds.twoColumnRow}>
              {/* LEFT SIDE: Wheel + seat slots */}
              <View style={ds.mainColumn5P}>
                <View style={[ds.waitingHeader, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                  <View>
                    <Text style={ds.waitingTitle}>5-PLAYER SPIN</Text>
                    <Text style={ds.waitingSubtitle}>
                      {round ? `Waiting for players… ${round.players.length}/5` : "Connecting to room..."}
                    </Text>
                  </View>
                  {/* Voice mic & speaker controls for Web / Desktop layout */}
                  <View style={ds.voiceControlsRow}>
                    <TouchableOpacity
                      onPress={handleToggleMic}
                      disabled={!round}
                      style={[ds.voiceControlBtn, micMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" }, !round && { opacity: 0.4 }]}
                    >
                      <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#ef4444" : "#22d3ee"} />
                      <Text style={[ds.voiceControlBtnText, { color: micMuted ? "#ef4444" : "#22d3ee" }]}>
                        {micMuted ? "Mic Off" : "Mic On"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleToggleSpeaker}
                      disabled={!round}
                      style={[ds.voiceControlBtn, masterSpeakerMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" }, !round && { opacity: 0.4 }]}
                    >
                      <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={16} color={masterSpeakerMuted ? "#ef4444" : "#a78bfa"} />
                      <Text style={[ds.voiceControlBtnText, { color: masterSpeakerMuted ? "#ef4444" : "#a78bfa" }]}>
                        {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Wheel */}
                <View style={ds.wheelCenter}>
                  <SpinWheel
                    size={wheelSize}
                    players={round ? round.players : []}
                    isSpinning={screenState === "spinning"}
                    winningSlice={winningSlice}
                    spinDuration={spinDuration}
                    onSpinComplete={handleSpinComplete}
                    status={round ? round.status : "waiting"}
                    mode="5_PLAYER"
                    speakingUserIds={speakingUserIds}
                  />
                </View>

                {/* Bottom confirmed player slots (Exactly 5 seats) */}
                <View style={[ds.playerSlots, { marginTop: 32, flexWrap: "wrap", justifyContent: "space-between" }]}>
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const player = round?.players.find(p => p.seatIndex === idx) || round?.players[idx];
                    const isSelf = player?.userId === user?.id;
                    return (
                      <View
                        key={idx}
                        style={[
                          ds.playerSeatCard,
                          player && { borderColor: "#8b5cf6", backgroundColor: "rgba(139, 92, 246, 0.08)" },
                          isSelf && { borderColor: "#22d3ee", backgroundColor: "rgba(34, 211, 238, 0.08)" },
                        ]}
                      >
                        {player ? (
                          <>
                            <View style={[ds.seatAvatar, { backgroundColor: isSelf ? "#22d3ee" : "#8b5cf6" }]}>
                              <Text style={ds.seatAvatarText}>{player.username.slice(0, 2).toUpperCase()}</Text>
                            </View>
                            <Text style={ds.seatName} numberOfLines={1}>{isSelf ? "You" : player.username}</Text>
                            <Text style={ds.seatStake}>{player.stake || 100} ETB</Text>
                            <View style={ds.seatCheckmark}>
                              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                            </View>
                            {!isSelf && player.userId && (
                              <TouchableOpacity
                                onPress={() => toggleMutePlayer(player.userId)}
                                style={{ position: "absolute", top: 6, right: 6, padding: 4 }}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name={mutedPlayers.has(player.userId) ? "mic-off-outline" : "mic-outline"}
                                  size={16}
                                  color={mutedPlayers.has(player.userId) ? "#ef4444" : "#8b93a7"}
                                />
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <>
                            <View style={[ds.seatAvatar, { backgroundColor: "#1e2340", borderStyle: "dashed", borderWidth: 1 }]}>
                              <Ionicons name="person-outline" size={16} color="#4b5563" />
                            </View>
                            <Text style={[ds.seatName, { color: "#4b5563" }]}>Waiting for player...</Text>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Leave Room Button */}
                <TouchableOpacity onPress={handleLeaveRoom} style={ds.leaveBtn} activeOpacity={0.85}>
                  <Ionicons name="exit-outline" size={16} color="#ef4444" />
                  <Text style={ds.leaveBtnText}>LEAVE ROOM</Text>
                </TouchableOpacity>
              </View>

              {/* RIGHT SIDE: Active Room Players & Per-User Voice Controls Panel */}
              <View style={ds.sidebar5P}>
                <View style={ds.rightSidebarPanel}>
                  <View style={ds.leaderboardHeader}>
                    <Text style={ds.leaderboardTitle}>ROOM PLAYERS ({round?.players?.length || 0}/5)</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newAllMuted = !allRemoteMuted;
                        setAllRemoteMuted(newAllMuted);
                        voiceService.muteAllRemoteUsers(newAllMuted);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: allRemoteMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}
                    >
                      <Ionicons name={allRemoteMuted ? "volume-mute" : "volume-high"} size={14} color={allRemoteMuted ? "#ef4444" : "#22c55e"} />
                      <Text style={{ color: allRemoteMuted ? "#ef4444" : "#22c55e", fontSize: 11, fontWeight: "600" }}>
                        {allRemoteMuted ? "Muted All" : "Mute All"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {Array.from({ length: 5 }, (_, idx) => {
                    const player = round?.players && round.players[idx] ? round.players[idx] : null;
                    const isSelf = player?.userId === user?.id;
                    const isMuted = player ? !!mutedRemoteUsers[player.userId] : false;
                    return (
                      <View key={player?.userId || idx} style={ds.leaderRow}>
                        <View style={[ds.leaderBadge, { backgroundColor: player ? (isSelf ? "#06b6d4" : "#3b82f6") : "rgba(255,255,255,0.08)", opacity: player ? 1 : 0.4 }]}>
                          <Text style={ds.leaderBadgeText}>{idx + 1}</Text>
                        </View>
                        <View style={ds.leaderDetails}>
                          <Text style={[ds.leaderName, !player && { color: "rgba(255,255,255,0.3)" }]} numberOfLines={1}>
                            {player ? `${player.username}${isSelf ? " (You)" : ""}` : "Waiting for player..."}
                          </Text>
                          <Text style={[ds.leaderVal, !player && { color: "rgba(255,255,255,0.2)" }]}>
                            {player ? `${player.stake} ETB` : "Empty Seat"}
                          </Text>
                        </View>
                        {player && !isSelf && (
                          <TouchableOpacity
                            onPress={() => {
                              const nextMuted = !isMuted;
                              setMutedRemoteUsers(prev => ({ ...prev, [player.userId]: nextMuted }));
                              voiceService.muteRemoteUser(player.userId, nextMuted);
                            }}
                            style={{ padding: 6, backgroundColor: isMuted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)", borderRadius: 8 }}
                          >
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={16} color={isMuted ? "#ef4444" : "#22c55e"} />
                          </TouchableOpacity>
                        )}
                        {player && isSelf && (
                          <View style={{ padding: 6, backgroundColor: "rgba(6, 182, 212, 0.15)", borderRadius: 8 }}>
                            <Ionicons name="person" size={16} color="#06b6d4" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Invite Players */}
                <TouchableOpacity style={ds.standingsBtn}>
                  <Ionicons name="person-add" size={14} color="#8b93a7" style={{ marginRight: 6 }} />
                  <Text style={ds.standingsBtnText}>Invite Players</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ════════════════════════════════════════════════════════════════
               ██  RAIL SPIN ROOM LAYOUT (DESKTOP)
               ════════════════════════════════════════════════════════════════ */
            <View style={ds.threeColumnRow}>
              {/* COLUMN 1: Stakes & Bet Selector */}
              <View style={ds.betSelectorColumn}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={ds.waitingTitle}>Endless Spin</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <View style={ds.publicPill}>
                      <Text style={ds.publicPillText}>Public Room</Text>
                    </View>
                    <Text style={{ color: "#8b93a7", fontSize: 11 }}>Stakes vary  •  Unlimited players</Text>
                  </View>
                  <TouchableOpacity style={ds.roomInfoBtn} activeOpacity={0.8}>
                    <Ionicons name="information-circle-outline" size={14} color="#8b93a7" />
                    <Text style={ds.roomInfoBtnText}>Room Info</Text>
                  </TouchableOpacity>
                </View>

                {!round ? (
                  /* ── PRE-JOIN BET SELECTOR ── */
                  <View style={ds.betCard}>
                    <Text style={ds.betCardLabel}>YOUR BET AMOUNT</Text>
                    <Text style={ds.betCardVal}>{betAmount} ETB</Text>
                    <Text style={ds.betLimits}>Min 10 ETB  •  Max 10,000 ETB</Text>

                    {/* Stepper +/- */}
                    <View style={ds.stepperRow}>
                      <TouchableOpacity
                        onPress={() => setBetAmount(prev => Math.max(10, prev - 10))}
                        disabled={!!round}
                        style={[ds.stepperBtn, !!round && { opacity: 0.3 }]}
                      >
                        <Ionicons name="remove" size={18} color="#fff" />
                      </TouchableOpacity>
                      <View style={ds.stepperInput}>
                        <Text style={ds.stepperValText}>{betAmount}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setBetAmount(prev => Math.min(10000, prev + 10))}
                        disabled={!!round}
                        style={[ds.stepperBtn, !!round && { opacity: 0.3 }]}
                      >
                        <Ionicons name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Preset Chips */}
                    <View style={ds.presetChips}>
                      {[10, 50, 100, 500].map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          disabled={!!round}
                          onPress={() => setBetAmount(preset)}
                          style={[
                            ds.presetChip,
                            betAmount === preset && ds.presetChipActive,
                            !!round && { opacity: 0.3 },
                          ]}
                        >
                          <Text style={[ds.presetChipText, betAmount === preset && ds.presetChipTextActive]}>
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Place Bet CTA */}
                    <TouchableOpacity
                      disabled={joinLoading || !!round}
                      onPress={() => handleJoinRoom("RAIL", betAmount)}
                      style={[ds.placeBetBtn, !!round && ds.placeBetBtnDisabled]}
                    >
                      {joinLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={ds.placeBetBtnText}>{round ? "BET CONFIRMED" : "PLACE BET"}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ── IN-GAME MONEY INCREASER ── */
                  <View style={ds.betCard}>
                    <Text style={ds.betCardLabel}>YOUR TOTAL STAKE</Text>
                    <Text style={[ds.betCardVal, { color: "#22d3ee" }]}>
                      {(() => {
                        const p = round.players.find(x => x.userId === user?.id);
                        return p ? p.stake : 0;
                      })()} ETB
                    </Text>
                    <Text style={ds.betLimits}>
                      {round.status !== "waiting"
                        ? "Round has started. Stakes locked!"
                        : countdown <= 5
                        ? "Room is locking! Stakes locked!"
                        : "Add more money to increase your odds!"}
                    </Text>

                    {/* Preset Chips to add */}
                    <View style={ds.presetChips}>
                      {[10, 50, 100, 500].map((val) => {
                        const isLocking = round.status !== "waiting" || countdown <= 5;
                        return (
                          <TouchableOpacity
                            key={val}
                            disabled={isLocking}
                            onPress={() => setAddAmount(val)}
                            style={[
                              ds.presetChip,
                              addAmount === val && ds.presetChipActive,
                              isLocking && { opacity: 0.3 },
                            ]}
                          >
                            <Text style={[ds.presetChipText, addAmount === val && ds.presetChipTextActive]}>
                              +{val}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Stepper to configure exact add amount */}
                    <View style={[ds.stepperRow, (round.status !== "waiting" || countdown <= 5) && { opacity: 0.4 }]}>
                      <TouchableOpacity
                        onPress={() => setAddAmount(prev => Math.max(10, prev - 10))}
                        disabled={round.status !== "waiting" || countdown <= 5}
                        style={ds.stepperBtn}
                      >
                        <Ionicons name="remove" size={18} color="#fff" />
                      </TouchableOpacity>
                      <View style={ds.stepperInput}>
                        <Text style={ds.stepperValText}>+{addAmount} ETB</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setAddAmount(prev => Math.min(10000, prev + 10))}
                        disabled={round.status !== "waiting" || countdown <= 5}
                        style={ds.stepperBtn}
                      >
                        <Ionicons name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Add Stake CTA */}
                    <TouchableOpacity
                      disabled={addLoading || round.status !== "waiting" || countdown <= 5}
                      onPress={() => handleAddStake(addAmount)}
                      style={[
                        ds.placeBetBtn,
                        { backgroundColor: "#06b6d4" },
                        (addLoading || round.status !== "waiting" || countdown <= 5) && {
                          backgroundColor: "rgba(6, 182, 212, 0.15)",
                          borderColor: "rgba(6, 182, 212, 0.3)",
                          borderWidth: 1,
                        },
                      ]}
                    >
                      {addLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={ds.placeBetBtnText}>
                          {round.status !== "waiting" || countdown <= 5 ? "LOCKED" : "ADD TO STAKE"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* COLUMN 2: Wheel + Countdown + Pot */}
              <View style={ds.wheelCenterColumn}>
                {/* SPIN ENDS IN */}
                <View style={ds.countdownBox}>
                  <Text style={ds.countdownLabel}>SPIN ENDS IN</Text>
                  <Text style={ds.countdownTime}>
                    {formatCountdown(countdown)}
                  </Text>
                </View>

                {/* Dynamic Wheel */}
                <View style={ds.wheelCenter}>
                  <SpinWheel
                    size={wheelSize}
                    players={previewPlayers}
                    isSpinning={screenState === "spinning"}
                    winningSlice={winningSlice}
                    spinDuration={spinDuration}
                    onSpinComplete={handleSpinComplete}
                    status={round ? round.status : "waiting"}
                    mode="RAIL"
                    speakingUserIds={speakingUserIds}
                  />
                </View>

                {/* Mic & Hear Lobby toggles */}
                <View style={ds.voiceControlsRow}>
                  <TouchableOpacity
                    onPress={handleToggleMic}
                    disabled={!round}
                    style={[ds.voiceControlBtn, micMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" }, !round && { opacity: 0.4 }]}
                  >
                    <Ionicons name={micMuted ? "mic-off" : "mic"} size={16} color={micMuted ? "#ef4444" : "#22d3ee"} />
                    <Text style={[ds.voiceControlBtnText, { color: micMuted ? "#ef4444" : "#22d3ee" }]}>
                      {micMuted ? "Mic Off" : "Mic On"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleSpeaker}
                    disabled={!round}
                    style={[ds.voiceControlBtn, masterSpeakerMuted && { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444" }, !round && { opacity: 0.4 }]}
                  >
                    <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={16} color={masterSpeakerMuted ? "#ef4444" : "#a78bfa"} />
                    <Text style={[ds.voiceControlBtnText, { color: masterSpeakerMuted ? "#ef4444" : "#a78bfa" }]}>
                      {masterSpeakerMuted ? "Muted All" : "Hear Lobby"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CURRENT POT */}
                <View style={ds.potBox}>
                  <Text style={ds.potBoxLabel}>CURRENT POT</Text>
                  <Text style={ds.potBoxVal}>{previewPot.toLocaleString()} ETB</Text>
                </View>

                {/* Leave Room */}
                <TouchableOpacity onPress={handleLeaveRoom} style={ds.leaveBtn} activeOpacity={0.85}>
                  <Ionicons name="exit-outline" size={16} color="#ef4444" />
                  <Text style={ds.leaveBtnText}>LEAVE ROOM</Text>
                </TouchableOpacity>
              </View>

              {/* COLUMN 3: Players List */}
              <View style={ds.playersListColumn}>
                <View style={ds.rightSidebarPanel}>
                  <View style={ds.leaderboardHeader}>
                    <Text style={ds.leaderboardTitle}>PLAYERS IN ROOM ({round ? round.players.length : 0})</Text>
                    <View style={ds.liveIndicatorDot} />
                  </View>
                  
                  <ScrollView style={{ maxHeight: 350, marginVertical: 12 }}>
                    {(round ? round.players : []).map((p: any, idx: number) => {
                      const isSelf = p.userId === user?.id;
                      const isHost = idx === 0;
                      const isMuted = mutedPlayers.has(p.userId);
                      const isSelfHost = round?.players[0]?.userId === user?.id;
                      
                      return (
                        <View key={p.userId || idx} style={ds.playerRow}>
                          <View style={[ds.seatAvatar, { backgroundColor: isSelf ? "#22d3ee" : "#8b5cf6", marginRight: 8 }]}>
                            <Text style={ds.seatAvatarText}>{p.username.slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={ds.playerName} numberOfLines={1}>
                              {isSelf ? "You" : p.username}
                            </Text>
                            <Text style={ds.playerBet}>{p.stake || 100} ETB</Text>
                          </View>
                          {isHost && (
                            <View style={ds.hostBadge}>
                              <Text style={ds.hostBadgeText}>HOST</Text>
                            </View>
                          )}
                          {isSpeaking(p.userId) && (
                            <Ionicons name="volume-high" size={14} color="#10b981" style={{ marginRight: 6 }} />
                          )}
                          {!isSelf && !p.isBot && (
                            <TouchableOpacity 
                              onPress={() => {
                                if (isSelfHost) {
                                  handleHostMuteUser(p.userId, isMuted);
                                } else {
                                  toggleMutePlayer(p.userId);
                                }
                              }}
                              style={{ padding: 4 }}
                            >
                              <Ionicons 
                                name={isMuted ? "mic-off-outline" : "mic-outline"} 
                                size={16} 
                                color={isMuted ? "#ef4444" : "#8b93a7"} 
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ════════════════════════════════════════════════════════════════
           ██  MOBILE SPIN ROOM LAYOUT
           ════════════════════════════════════════════════════════════════ */
        <View style={{ flex: 1, backgroundColor: is5Player ? "#0c0824" : "#060814", paddingHorizontal: 16, paddingTop: 10, justifyContent: "space-between", position: "relative" }}>
            {/* Top Header Row (SINGLE HEADER BAR ON MOBILE) */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 6, position: "relative", zIndex: 10 }}>
              {/* Back Button */}
              <TouchableOpacity
                onPress={handleLeaveRoom}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1.5,
                  borderColor: "#ef4444",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={20} color="#ef4444" />
              </TouchableOpacity>

              {/* Dead-Centered Countdown Timer Pill - Hidden in 5-Player mode */}
              {!is5Player && (
                <View style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                  pointerEvents: "none",
                }}>
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "rgba(13, 17, 36, 0.9)",
                    borderRadius: 20,
                    paddingHorizontal: 18,
                    paddingVertical: 7,
                    borderWidth: 1.5,
                    borderColor: "#8b5cf6",
                    shadowColor: "#8b5cf6",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 10,
                    elevation: 8,
                  }}>
                    <Ionicons name="time-outline" size={16} color="#f5b642" />
                    <Text style={{ color: "#f5b642", fontSize: 18, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                      {formatCountdown(countdown)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Top Right Action Icons: Speaker & Mic */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, zIndex: 2 }}>
                <TouchableOpacity
                  onPress={handleToggleSpeaker}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1.5,
                    borderColor: masterSpeakerMuted ? "#ef4444" : "#00daf3",
                    backgroundColor: masterSpeakerMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 218, 243, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={masterSpeakerMuted ? "volume-mute" : "volume-high"} size={18} color={masterSpeakerMuted ? "#ef4444" : "#00daf3"} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleMic}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1.5,
                    borderColor: micMuted ? "#ef4444" : "#00daf3",
                    backgroundColor: micMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 218, 243, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={micMuted ? "mic-off" : "mic"} size={18} color={micMuted ? "#ef4444" : "#00daf3"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 5-PLAYER SPIN BANNER HEADER & SIDE BADGES (Image 1 Style) */}
            {is5Player && (
              <View style={{ alignItems: "center", width: "100%", marginVertical: 4 }}>
                {/* Stars + 5-PLAYER Subheader */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="star" size={12} color="#f5b642" />
                  <Text style={{ color: "#f5b642", fontSize: 13, fontWeight: "900", letterSpacing: 1.5, fontFamily: "Inter, sans-serif" }}>
                    5-PLAYER
                  </Text>
                  <Ionicons name="star" size={12} color="#f5b642" />
                </View>

                {/* Big SPIN Title */}
                <Text style={{
                  color: "#ffffff",
                  fontSize: 38,
                  fontWeight: "900",
                  letterSpacing: 2,
                  fontFamily: "Inter, sans-serif",
                  marginTop: -2,
                }}>
                  SPIN
                </Text>

                {/* Tagline */}
                <Text style={{ color: "#d8b4fe", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif", marginTop: -2 }}>
                  ◆ Spin, Play & Win Big! ◆
                </Text>

                {/* Flanking Side Badges (Entry Fee Left, 5 Players Live Right) */}
                <View style={{ flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingHorizontal: 4 }}>
                  {/* Left: ENTRY FEE 100 ETB */}
                  <View style={{
                    backgroundColor: "rgba(244, 114, 182, 0.12)",
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: "#f472b6",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    alignItems: "center",
                    minWidth: 95,
                  }}>
                    <Text style={{ color: "#f472b6", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>ENTRY FEE</Text>
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", marginTop: 1, fontFamily: "Inter, sans-serif" }}>100 ETB</Text>
                  </View>

                  {/* Right: 5 PLAYERS LIVE */}
                  <View style={{
                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: "#a855f7",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    alignItems: "center",
                    minWidth: 95,
                  }}>
                    <Text style={{ color: "#00daf3", fontSize: 18, fontWeight: "900", lineHeight: 20, fontFamily: "Inter, sans-serif" }}>5</Text>
                    <Text style={{ color: "#c084fc", fontSize: 8, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>PLAYERS LIVE</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Center Spin Wheel with Stage Pedestal */}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginVertical: 6, position: "relative" }}>
              <SpinWheel
                size={Math.min(screenW - 48, 320)}
                players={displayPlayers}
                isSpinning={screenState === "spinning"}
                winningSlice={winningSlice}
                spinDuration={spinDuration}
                onSpinComplete={handleSpinComplete}
                status={round ? round.status : "waiting"}
                mode={is5Player ? "5_PLAYER" : "RAIL"}
                speakingUserIds={speakingUserIds}
              />

              {/* Glowing Stage Pedestal ring under wheel base in 5-player mode */}
              {is5Player && (
                <View style={{
                  position: "absolute",
                  bottom: 4,
                  width: 140,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 1.5,
                  borderColor: "rgba(168, 85, 247, 0.5)",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  shadowColor: "#a855f7",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 10,
                  zIndex: -1,
                }} />
              )}
            </View>

            {/* Bottom Floating Controls Card */}
            <View style={{
              backgroundColor: "rgba(13, 17, 36, 0.92)",
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: "#242c4a",
              padding: 14,
              marginBottom: 16,
              width: "100%",
              shadowColor: "#8b5cf6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
            }}>
              {/* Top Stepper Row: [-] +10 ETB [+] AND Bet/Play Button beside [+] (Hidden in 5-player mode) */}
              {!is5Player && (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "rgba(20, 26, 48, 0.8)",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#1e2646",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 12,
                }}>
                  {/* Minus Button */}
                  <TouchableOpacity
                    onPress={() => {
                      if (round) setAddAmount(prev => Math.max(10, prev - 10));
                      else setBetAmount(prev => Math.max(10, prev - 10));
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="remove" size={20} color="#ef4444" />
                  </TouchableOpacity>

                  {/* Stake Amount Display (Tappable on Mobile) */}
                  <TouchableOpacity
                    disabled={joinLoading || addLoading}
                    onPress={() => {
                      if (round) handleAddStake(addAmount);
                      else handleJoinRoom(is5Player ? "5_PLAYER" : "RAIL", betAmount);
                    }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900", fontFamily: "Inter, sans-serif" }}>
                      +{round ? addAmount : betAmount} ETB
                    </Text>
                  </TouchableOpacity>

                  {/* Plus Button & Bet/Play Button side by side */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {/* Plus Button */}
                    <TouchableOpacity
                      onPress={() => {
                        if (round) setAddAmount(prev => Math.min(10000, prev + 10));
                        else setBetAmount(prev => Math.min(10000, prev + 10));
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: "#22c55e",
                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color="#22c55e" />
                    </TouchableOpacity>

                    {/* Bet / Play Button beside + button */}
                    <TouchableOpacity
                      disabled={joinLoading || addLoading}
                      onPress={() => {
                        if (round) handleAddStake(addAmount);
                        else handleJoinRoom(is5Player ? "5_PLAYER" : "RAIL", betAmount);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        height: 36,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: addLoading || joinLoading ? "#00daf3" : "#8b5cf6",
                        backgroundColor: addLoading || joinLoading ? "rgba(0, 218, 243, 0.2)" : "#16102b",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 4,
                        shadowColor: "#8b5cf6",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                      activeOpacity={0.8}
                    >
                      {joinLoading || addLoading ? (
                        <ActivityIndicator size="small" color="#00daf3" />
                      ) : (
                        <Ionicons name="play" size={20} color="#8b5cf6" style={{ marginLeft: 2 }} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Row 2: Joined Player Profiles (First Names) on left + Drawer Trigger on right */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {/* Joined Players Profiles */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 8 }} style={{ flex: 1, marginRight: 8 }}>
                  {displayPlayers.map((p: any, idx: number) => {
                    const borderColors = ["#ef4444", "#a78bfa", "#22c55e", "#00daf3", "#f5b642"];
                    const color = borderColors[idx % borderColors.length];
                    const rawName = p.username || "Player";
                    const firstName = rawName.split(" ")[0].split("_")[0];
                    const isSelf = p.userId === user?.id;

                    return (
                      <TouchableOpacity
                        key={p.userId || idx}
                        onPress={() => setMobilePlayersSheetVisible(true)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: "rgba(20, 26, 48, 0.9)",
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: color,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color + "30", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="person" size={12} color={color} />
                        </View>
                        <Text numberOfLines={1} style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>
                          {isSelf ? "You" : (firstName.length > 8 ? firstName.slice(0, 7) + "…" : firstName)}
                        </Text>
                        <Text style={{ color: color, fontSize: 10, fontWeight: "700" }}>
                          {p.stake || 100} ETB
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Players Drawer Trigger Button (Opens drawer sheet) */}
                <TouchableOpacity
                  onPress={() => setMobilePlayersSheetVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: "#8b5cf6",
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people" size={16} color="#a78bfa" />
                  <Ionicons name="chevron-up" size={16} color="#a78bfa" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
         ██  PRE-SPIN COUNTDOWN OVERLAY (3…2…1…)
         ════════════════════════════════════════════════════════════════ */}
      {preSpinCountdown !== null && (
        <View style={ds.overlayBackdrop}>
          <View style={ds.countdownOverlay}>
            <Text style={ds.countdownOverlayNumber}>
              {preSpinCountdown > 0 ? preSpinCountdown : "SPIN!"}
            </Text>
            <Text style={ds.countdownOverlayLabel}>
              {preSpinCountdown > 0 ? "Get Ready…" : ""}
            </Text>
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
         ██  WINNER / LOSER POPUP OVERLAY
         ════════════════════════════════════════════════════════════════ */}
      {screenState === "result" && resultData && (
        <View style={ds.overlayBackdrop}>
          {/* Falling Celebration Confetti Rain for Winner */}
          {isMyWin && <CelebrationConfetti />}

          <View style={[
            ds.resultPopup,
            {
              backgroundColor: "rgba(13, 16, 33, 0.96)",
              borderColor: isMyWin ? "#F5B642" : "rgba(255, 255, 255, 0.12)",
              borderWidth: 2,
              borderRadius: 28,
              padding: 24,
              shadowColor: isMyWin ? "#F5B642" : "#7C3AED",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.7,
              shadowRadius: 30,
              elevation: 20,
            }
          ]}>
            {/* Trophy / Ribbon Icon Circle */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isMyWin ? "rgba(245, 182, 66, 0.18)" : "rgba(124, 58, 237, 0.18)",
              borderWidth: 2,
              borderColor: isMyWin ? "#F5B642" : "#7C3AED",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}>
              <Ionicons
                name={isMyWin ? "trophy" : "ribbon"}
                size={44}
                color={isMyWin ? "#F5B642" : "#A78BFA"}
              />
            </View>

            {/* Title */}
            <Text style={{
              color: isMyWin ? "#FDE047" : "#FFFFFF",
              fontSize: 24,
              fontWeight: "900",
              letterSpacing: 0.5,
              textShadowColor: isMyWin ? "rgba(245, 182, 66, 0.6)" : "rgba(0,0,0,0.8)",
              textShadowRadius: 10,
            }}>
              {isMyWin ? "🎉 VICTORY!" : "Better Luck Next Time"}
            </Text>

            {/* Winner Info */}
            <View style={[ds.resultWinnerRow, { backgroundColor: "rgba(255, 255, 255, 0.04)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginVertical: 12, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)" }]}>
              <View style={[ds.seatAvatar, { backgroundColor: isMyWin ? "#F5B642" : "#7C3AED", width: 36, height: 36, borderRadius: 18, marginRight: 10 }]}>
                <Text style={[ds.seatAvatarText, { fontSize: 13, color: "#FFFFFF" }]}>
                  {resultData.winnerName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[ds.resultWinnerName, { color: "#FFFFFF", fontWeight: "900" }]}>{resultData.winnerName}</Text>
                <Text style={[ds.resultWinnerLabel, { color: "rgba(255, 255, 255, 0.5)" }]}>Round Winner</Text>
              </View>
            </View>

            {/* Prize Amount Box */}
            <View style={{
              backgroundColor: isMyWin ? "rgba(245, 182, 66, 0.12)" : "rgba(124, 58, 237, 0.12)",
              borderWidth: 1.5,
              borderColor: isMyWin ? "rgba(245, 182, 66, 0.4)" : "rgba(124, 58, 237, 0.4)",
              borderRadius: 20,
              paddingHorizontal: 24,
              paddingVertical: 14,
              marginBottom: 16,
              alignItems: "center",
              width: "100%",
            }}>
              <Text style={{ color: isMyWin ? "#FEF08A" : "#A78BFA", fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>PRIZE WON</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 4 }}>
                {resultData.prizeAmount.toLocaleString()} ETB
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={ds.resultActions}>
              {round?.mode === "5_PLAYER" && rematchAvailable && (
                <TouchableOpacity
                  onPress={handleRematchClick}
                  disabled={rematchAccepted}
                  style={[
                    ds.resultPlayAgainBtn,
                    { backgroundColor: rematchAccepted ? "#22C55E" : "#7C3AED", marginBottom: 10, borderRadius: 16 },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={rematchAccepted ? "checkmark-circle" : "refresh-circle"} size={18} color="#fff" />
                  <Text style={ds.resultPlayAgainText}>
                    {rematchAccepted ? `ACCEPTED (${rematchCount})` : "REMATCH (100 ETB)"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handlePlayAgain}
                style={[ds.resultPlayAgainBtn, { backgroundColor: isMyWin ? "#F5B642" : "#7C3AED", borderRadius: 16 }]}
                activeOpacity={0.85}
              >
                <Ionicons name="reload" size={16} color="#fff" />
                <Text style={[ds.resultPlayAgainText, { color: "#FFFFFF" }]}>PLAY AGAIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  voiceService.leaveChannel();
                  setScreenState("browse");
                  setRound(null);
                  setIsSpinning(false);
                  setWinningSlice(null);
                  setResultData(null);
                  setCountdown(0);
                  refreshProfile();
                  router.replace("/(authed)/home/gameplay");
                }}
                style={[ds.resultLeaveBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)", borderRadius: 16 }]}
                activeOpacity={0.85}
              >
                <Ionicons name="exit-outline" size={16} color="#EF4444" />
                <Text style={[ds.resultLeaveText, { color: "#EF4444" }]}>LEAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════
         ██  MOBILE PLAYERS BOTTOM SHEET DRAWER (AFTER CLICKING)
         ════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={mobilePlayersSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMobilePlayersSheetVisible(false)}
      >
        <View style={ds.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMobilePlayersSheetVisible(false)} />

          <View style={ds.drawerCard}>
            {/* Top Grab Handle */}
            <TouchableOpacity
              onPress={() => setMobilePlayersSheetVisible(false)}
              style={ds.drawerHandleWrap}
              activeOpacity={0.8}
            >
              <View style={ds.drawerHandleBar} />
            </TouchableOpacity>

            {/* Players List Header */}
            <Text style={ds.drawerTitle}>PLAYERS ({round ? round.players.length : previewPlayers.length})</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {(round ? round.players : previewPlayers).map((p: any, idx: number) => {
                const borderColors = ["#ff4b4b", "#a78bfa", "#22c55e", "#00daf3", "#fbbf24"];
                const color = borderColors[idx % borderColors.length];
                const isSelf = p.userId === user?.id;
                const isMuted = mutedPlayers.has(p.userId);
                const isSelfHost = round?.players[0]?.userId === user?.id;
                const isSpeaking = Array.isArray(speakingUserIds) && speakingUserIds.some(id => String(id) === String(p.userId));

                return (
                  <View key={p.userId || idx} style={[ds.drawerPlayerRow, !isMuted && { borderColor: '#22c55e', borderWidth: 1.5 }]}>
                    <View style={[ds.drawerAvatarCircle, { borderColor: !isMuted ? '#22c55e' : color }]}>
                      <Ionicons name="person" size={18} color={!isMuted ? '#22c55e' : color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={ds.drawerPlayerName}>{isSelf ? "You (" + (p.username || "Zara") + ")" : p.username || "Zara"}</Text>
                        {isSpeaking && <SpeakingWaveAnimation />}
                      </View>
                      <Text style={[ds.drawerPlayerStake, { color }]}>{p.stake || 100} ETB</Text>
                    </View>

                    {/* Microphone Icon Button on right with mute/unmute action */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isSelfHost) {
                          handleHostMuteUser(p.userId, isMuted);
                        } else {
                          toggleMutePlayer(p.userId);
                        }
                      }}
                      style={[ds.drawerMicBtn, { borderColor: isMuted ? '#ef4444' : '#22c55e', backgroundColor: isMuted ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isMuted ? "mic-off-outline" : "mic"}
                        size={18}
                        color={isMuted ? "#ef4444" : "#22c55e"}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pull down indicator at bottom */}
            <TouchableOpacity
              onPress={() => setMobilePlayersSheetVisible(false)}
              style={ds.drawerBottomClose}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={20} color="#8b93a7" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 16,
  },
  leaveBtnText: { color: "#ef4444", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
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
    color: "#22d3ee",
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
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.2)",
  },
  publicPillText: {
    color: "#22d3ee",
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
    color: "#22d3ee",
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
    borderColor: "#22d3ee",
    backgroundColor: "#0b1528",
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
    color: "#22d3ee",
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
    color: "#22d3ee",
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
