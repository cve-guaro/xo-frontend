import ResultOverlay from "../../../components/game/ResultOverlay";
import LeaveGameConfirmation from "../../../components/LeaveGameConfirmation";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
  AppState,
  Easing,
} from "react-native";
import Toast from "../../../components/Toast";
import { useAuth } from "../../../context/authContext";
import { useSocketActions } from "../../../context/socketContext";
import FlashToast, { MatchFoundToastHandle } from "../../../components/game/FlashToast";
import RematchTopPopup from "../../../components/game/RematchPopup";
import EmojiBar, { EMOJI_GIFS } from "../../../components/game/EmojiBar";
import EmojiFloat from "../../../components/game/EmojiFloat";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import { haptics } from "../../../lib/haptcs";
import { WebPressable } from "../../../components/WebPressable";

// Subcomponent for Symbol with smooth, bouncy spring pop animation
const CellSymbol = React.memo(({ 
  symbol, 
  size, 
  isDesktop, 
  isWinning = false,
}: { 
  symbol: string; 
  size: number; 
  isDesktop: boolean;
  isWinning?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.2);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [symbol]);

  const isX = symbol === "X";
  const iconColor = isX ? "#fd6f85" : "#00daf3";
  const iconSize = isDesktop ? size * 0.8 : size * 0.85;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons 
        name={isX ? "close" : "radio-button-off"} 
        size={iconSize} 
        color={iconColor} 
        style={[
          isDesktop ? (isX ? styles.neonXShadow : styles.neonOShadow) : {},
          isWinning && {
            shadowColor: iconColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 18,
            elevation: 12,
          }
        ]}
      />
    </Animated.View>
  );
});

// Interactive Board Cell with tactile spring depression, hover preview, and smooth feedback
const BoardCell = React.memo(({
  index,
  symbol,
  isMyTurn,
  mySymbol,
  cellSize,
  isDesktop,
  isWinning,
  onPress,
}: {
  index: number;
  symbol: BoardCell;
  isMyTurn: boolean;
  mySymbol: "X" | "O";
  cellSize: number;
  isDesktop: boolean;
  isWinning: boolean;
  onPress: (index: number) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (symbol === "_" && isMyTurn) {
      haptics.tap();
      Animated.spring(pressAnim, {
        toValue: 0.92,
        tension: 400,
        friction: 15,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 300,
      friction: 12,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const isEmpty = symbol === "_";
  const canPlay = isEmpty && isMyTurn;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(index)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={Platform.OS === "web" && canPlay ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.cell,
        isDesktop && { width: cellSize, height: cellSize, borderRadius: 28 },
        canPlay && styles.cellEmptyActive,
        canPlay && isHovered && {
          backgroundColor: mySymbol === "X" ? "rgba(253, 111, 133, 0.12)" : "rgba(0, 218, 243, 0.12)",
          borderColor: mySymbol === "X" ? "rgba(253, 111, 133, 0.45)" : "rgba(0, 218, 243, 0.45)",
          transform: [{ scale: 1.025 }],
        },
        isWinning && {
          borderColor: symbol === "X" ? "#fd6f85" : "#00daf3",
          backgroundColor: symbol === "X" ? "rgba(253, 111, 133, 0.22)" : "rgba(0, 218, 243, 0.22)",
          shadowColor: symbol === "X" ? "#fd6f85" : "#00daf3",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 16,
          elevation: 10,
        },
      ]}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressAnim }],
        }}
      >
        {!isEmpty ? (
          <CellSymbol
            symbol={symbol}
            size={cellSize}
            isDesktop={isDesktop}
            isWinning={isWinning}
          />
        ) : isHovered && canPlay ? (
          <View style={{ opacity: 0.28 }}>
            <Ionicons
              name={mySymbol === "X" ? "close" : "radio-button-off"}
              size={isDesktop ? cellSize * 0.75 : cellSize * 0.8}
              color={mySymbol === "X" ? "#fd6f85" : "#00daf3"}
            />
          </View>
        ) : canPlay ? (
          <View style={[styles.turnCellDot, { backgroundColor: "#fff", opacity: 0.85 }]} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const { width } = Dimensions.get("window");
const BOARD_SIZE = 3;
const CELL = Math.max(54, Math.floor((width - 64) / BOARD_SIZE) - 6);
const GLASS_BG = "rgba(12,16,28,0.62)";
const GLASS_BG_SOFT = "rgba(12,16,28,0.42)";
const GLASS_BORDER = "rgba(255,255,255,0.10)";
const GLASS_BORDER_SOFT = "rgba(255,255,255,0.08)";
const TEXT_MAIN = "rgba(255,255,255,0.94)";
const TEXT_SUB = "rgba(255,255,255,0.60)";


type Timers = { X: number; O: number };
type BoardCell = "X" | "O" | "_";
function isXO(v: any): v is "X" | "O" {
  return v === "X" || v === "O";
}

const EMPTY_BOARD: BoardCell[] = ["_", "_", "_", "_", "_", "_", "_", "_", "_"];

function calculateWinAmount(amount: number) {
  const cut = amount === 10 ? 0.2 : 0.1; // 20% cut for 10 Birr, 10% cut for others
  return Math.floor(amount * 2 * (1 - cut));
}

export default function GameRoom() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    symbol?: "X" | "O" | string;
    vs?: string;
    oppId?: string;
    amount?: string;
    _k?: string;
    time?: string;
  }>();

  const { user, token, language, switchLanguage, t, refreshProfile, fixUrl } = useAuth();
  const { onMessage, send, emitAck, setIsGameActive, ensureConnected } = useSocketActions();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
  // Calculate maximum safe board dimension so it perfectly fits both width and height bounds.
  // We need to account for TopBar (height ~80), TurnBanner (height ~80), BottomBar (height ~100).
  const verticalPadding = isDesktop ? 160 : 250; 
  const safeBox = Math.min(windowWidth - (isDesktop ? 120 : 40), windowHeight - verticalPadding);
  // Cap max size on desktop to 720, and ensure it doesn't go below 280 on mobile if possible
  const boardOuterSize = Math.max(isDesktop ? 300 : 280, Math.min(safeBox, isDesktop ? 460 : 500));
  const boardInnerSize = boardOuterSize - 48; // padding is 24 on all sides, so 48 total

  const dynamicCellSize = Math.floor(boardInnerSize / 3) - 8;

  const matchId = useMemo(() => String(params?.id || ""), [params?.id]);
  const amountParam = useMemo(() => String(params?.amount || "0"), [params?.amount]);
  const timerParam = useMemo(() => {
    const tVal = Number(params?.time);
    return isNaN(tVal) ? 30 : tVal;
  }, [params?.time]);

  // ---- derived from params ----
  const initialParamSymbol = useMemo<"X" | "O">(
    () => (isXO(params?.symbol) ? (params!.symbol as "X" | "O") : "X"),
    [params?.symbol]
  );
  const initialOpponent = useMemo(() => String(params?.vs || "Opponent"), [params?.vs]);
  const initialOpponentId = useMemo(() => String(params?.oppId || params?.vs || ""), [params?.oppId, params?.vs]);

  // ---------- stable refs ----------
  const mySymbolRef = useRef<"X" | "O">("X");
  const opponentRef = useRef<string>("Opponent");
  const opponentIdRef = useRef<string>("");
  const languageRef = useRef(language);
  const tRef = useRef(t);
  const gameEndedRef = useRef(false);
  const forfeitedRef = useRef(false);
  const matchIdRef = useRef(matchId);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  const toastRef = useRef<MatchFoundToastHandle>(null);
  const isFocused = useIsFocused();

  const DEFAULT_TIMERS: Timers = { X: timerParam, O: timerParam };

  useEffect(() => {
    languageRef.current = language;
    tRef.current = t;
  }, [language, t]);

  // ---------- sounds ----------
  const { isPlaying: bgMusicOn, toggleMusic: toggleGlobalMusic, unlockAudio } = useBackgroundMusic();
  const soundOnRef = useRef(bgMusicOn);

  // Sync with global music state
  useEffect(() => {
    soundOnRef.current = bgMusicOn;
  }, [bgMusicOn]);

  const clickSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));
  const winSound = useAudioPlayer(require("../../../assets/sounds/win.mp3"));
  const loseSound = useAudioPlayer(require("../../../assets/sounds/lose.wav"));
  const xoSound = useAudioPlayer(require("../../../assets/sounds/click.wav"));

  const playClick = useCallback(() => { if (soundOnRef.current) clickSound.play(); }, [clickSound]);
  const playWin = useCallback(() => { if (soundOnRef.current) winSound.play(); }, [winSound]);
  const playLose = useCallback(() => { if (soundOnRef.current) loseSound.play(); }, [loseSound]);
  const playXO = useCallback(() => { if (soundOnRef.current) xoSound.play(); }, [xoSound]);

  // ---------- game state ----------
  const [mySymbol, setMySymbol] = useState<"X" | "O">(initialParamSymbol);
  const [opponent, setOpponent] = useState<string>(initialOpponent);
  const [opponentId, setOpponentId] = useState<string>(initialOpponentId);

  const [timers, setTimers] = useState<Timers>({ ...DEFAULT_TIMERS });
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [board, setBoard] = useState<BoardCell[]>(() => [...EMPTY_BOARD]);
  const boardRef = useRef<BoardCell[]>(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const currentRoundRef = useRef<number>(1);

  const [locked, setLocked] = useState(false);
  const [rematchOffer, setRematchOffer] = useState<{ visible: boolean; fromName?: string; amount?: number; fromUserId?: string } | null>(null);
  const [waitingForRematch, setWaitingForRematch] = useState(false);

  // IMPORTANT: ref-only syncing gate (no UI)
  const syncingRef = useRef<boolean>(true);

  // auto-unlock timer to prevent “stuck syncing” if server delays
  const syncUnlockTimerRef = useRef<any>(null);
  const startSyncGuard = useCallback((ms = 1200) => {
    syncingRef.current = true;
    if (syncUnlockTimerRef.current) clearTimeout(syncUnlockTimerRef.current);
    syncUnlockTimerRef.current = setTimeout(() => {
      // if server never sent state, don't block user forever
      syncingRef.current = false;
    }, ms);
  }, []);
  const stopSyncGuard = useCallback(() => {
    syncingRef.current = false;
    if (syncUnlockTimerRef.current) clearTimeout(syncUnlockTimerRef.current);
    syncUnlockTimerRef.current = null;
  }, []);


  // Toast
  const [toast, setToast] = useState<{
    msg: string;
    color?: string;
    icon?: React.ComponentProps<typeof Ionicons>["name"];
    onHide?: () => void;
  } | null>(null);

  // Result overlay
  const [result, setResult] = useState<{ visible: boolean; outcome: "win" | "lose"; amount: number }>({
    visible: false,
    outcome: "win",
    amount: 0,
  });

  // Leave game confirmation
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);

  useEffect(() => {
    setIsGameActive(true);
    return () => {
      setIsGameActive(false);
      if (token) send("leave_room", { token });
    };
  }, [setIsGameActive, token, send]);

  // Draw flash
  const [drawFlash, setDrawFlash] = useState(false);
  const drawOpacity = useRef(new Animated.Value(0)).current;

  // Game start alert
  const [gameStartAlert, setGameStartAlert] = useState(false);
  const gameStartScale = useRef(new Animated.Value(0.8)).current;
  const gameStartOpacity = useRef(new Animated.Value(0)).current;

  // Vibration guard
  const vibrationRef = useRef(false);

  // Emoji state
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);

  // Win line state
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const winLineAnim = useRef(new Animated.Value(0)).current;

  // Navigation guard
  const handledNavigateRef = useRef(false);
  const safeReplace = useCallback(
    (pathOrObj: any) => {
      if (handledNavigateRef.current) return;
      handledNavigateRef.current = true;
      router.replace(pathOrObj);
    },
    [router]
  );

  // ---------- helpers ----------
  const hideResultOverlay = useCallback(() => {
    setResult({ visible: false, outcome: "win", amount: 0 });
  }, []);

  const resetForNewGame = useCallback(
    (opts?: { keepIdentity?: boolean; nextIdentity?: { symbol?: "X" | "O"; oppName?: string; oppId?: string } }) => {
      setBoard([...EMPTY_BOARD]);
      setTimers({ ...DEFAULT_TIMERS });
      setTurn("X");
      setLocked(false);
      handledNavigateRef.current = false;
      setRematchOffer(null);
      setWaitingForRematch(false);
      console.log("[GAME] Board reset and unlocked for new match - ID:", matchId);

      // start “sync gate” until server state arrives
      startSyncGuard(1200);

      // overlays / ui
      setToast(null);
      setDrawFlash(false);
      drawOpacity.setValue(0);

      setGameStartAlert(false);
      gameStartScale.setValue(0.8);
      gameStartOpacity.setValue(0);

      setResult({ visible: false, outcome: "win", amount: 0 });
      setWinLine(null);

      handledNavigateRef.current = false;

      if (!opts?.keepIdentity) {
        const nextSymbol = opts?.nextIdentity?.symbol ?? initialParamSymbol;
        const nextOppName = opts?.nextIdentity?.oppName ?? initialOpponent;
        const nextOppId = opts?.nextIdentity?.oppId ?? initialOpponentId;

        setMySymbol(nextSymbol);
        mySymbolRef.current = nextSymbol;

        setOpponent(nextOppName);
        opponentRef.current = nextOppName;

        setOpponentId(nextOppId);
        opponentIdRef.current = nextOppId;
      }
    },
    [
      drawOpacity,
      gameStartOpacity,
      gameStartScale,
      initialOpponent,
      initialOpponentId,
      initialParamSymbol,
      startSyncGuard,
    ]
  );

  const hideAllOverlays = useCallback(() => {
    setResult({ visible: false, outcome: "win", amount: 0 });
    setToast(null);
    setGameStartAlert(false);
    setDrawFlash(false);
    drawOpacity.setValue(0);
  }, [drawOpacity]);

  useFocusEffect(
    useCallback(() => {
      // when screen focuses, start a short sync gate until first server state arrives
      startSyncGuard(1200);
      handledNavigateRef.current = false;

      // Lazy load background music on focus/mount
      try {
        unlockAudio();
      } catch (e) {}

      // Force state hydration for race conditions and reconnects
      if (token && matchId && matchId !== "undefined") {
        try {
          send("reconnect_match", { token, matchId });
        } catch {}
      }

      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setLeaveConfirmVisible(true);
        return true;
      });

      return () => {
        sub.remove();
        hideAllOverlays();
        stopSyncGuard();
        resetForNewGame({ keepIdentity: false });
      };
    }, [matchId, resetForNewGame, send, token, router, hideAllOverlays, startSyncGuard, stopSyncGuard])
  );

  // keep refs in sync
  useEffect(() => {
    mySymbolRef.current = mySymbol;
  }, [mySymbol]);
  useEffect(() => {
    opponentRef.current = opponent;
  }, [opponent]);
  useEffect(() => {
    opponentIdRef.current = opponentId;
  }, [opponentId]);

  // Guard bad params
  useEffect(() => {
    if (!matchId || matchId === "undefined") router.replace("/home/gameplay");
  }, [matchId, router]);

  useEffect(() => {
    toastRef.current?.show({ amount: parseInt(amountParam), seconds: 3, opponentName: "...", message: "Opponent found!" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // IMPORTANT: when matchId changes, re-arm syncing gate
  useEffect(() => {
    gameEndedRef.current = false;
    forfeitedRef.current = false;
    hideResultOverlay();
    resetForNewGame({
      keepIdentity: false,
      nextIdentity: { symbol: initialParamSymbol, oppName: initialOpponent, oppId: initialOpponentId },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // turn banner static opacity (animation removed for performance)
  const bannerGlowOpacity = 0.32;

  const triggerDrawFlash = useCallback(() => {
    setDrawFlash(true);
    drawOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(drawOpacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(drawOpacity, { toValue: 0, delay: 700, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setDrawFlash(false));
  }, [drawOpacity]);

  const triggerVibration = useCallback(() => {
    if (vibrationRef.current) return;
    vibrationRef.current = true;
    Vibration.vibrate([0, 500, 200, 500]);
    setTimeout(() => {
      vibrationRef.current = false;
    }, 2000);
  }, []);

  const showGameStartAlert = useCallback(async () => {
    setGameStartAlert(true);
    await playXO();

    gameStartScale.setValue(0.8);
    gameStartOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(gameStartScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(gameStartOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(gameStartScale, { toValue: 1.1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(gameStartOpacity, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => setGameStartAlert(false));
    }, 500);
  }, [gameStartOpacity, gameStartScale, playXO]);

  // ---------- Health check and Visibility auto-reconnect ----------
  useEffect(() => {
    if (!isFocused || !matchId) return;

    const runHealthCheck = async () => {
      try {
        const connected = await ensureConnected();
        if (!connected) return;

        // Fetch fresh game state
        const res = await emitAck("get_game_state", { token, matchId }, 4000);
        if (res && res.ok && res.data) {
          const p = res.data;
          // Sync state
          if (Array.isArray(p.board) && p.board.length === 9) {
            setBoard(p.board as BoardCell[]);
            boardRef.current = p.board as BoardCell[];
          }
          if (isXO(p.turn)) setTurn(p.turn);
          if (p.timers) setTimers(p.timers);
          if (isXO(p.symbol)) {
            setMySymbol(p.symbol);
            mySymbolRef.current = p.symbol;
          }
          if (p.opponentUsername) setOpponent(p.opponentUsername);
          if (p.opponentId) setOpponentId(p.opponentId);
          stopSyncGuard();
        } else if (res && !res.ok) {
          const err = String(res.error || "").toLowerCase();
          if (err.includes("not found") || err.includes("expired") || err.includes("invalid")) {
            console.log("[HEALTH_CHECK] Game invalid/expired. Redirecting.");
            setToast({
              msg: languageRef.current === "en" ? "Game expired or refunded." : "ጨዋታው አልቋል ወይም ተመላሽ ተደርጓል።",
              color: "#ff6b6b",
              icon: "alert-circle"
            });
            refreshProfile?.();
            setTimeout(() => {
              safeReplace("/home/gameplay");
            }, 2000);
          }
        }
      } catch (err) {
        console.warn("[HEALTH_CHECK] Error running checks:", err);
      }
    };

    // Run health check every 5 seconds
    const interval = setInterval(runHealthCheck, 5000);

    // Listen for visibility changes (App coming to foreground)
    const handleAppState = (nextState: string) => {
      if (nextState === "active") {
        console.log("[AppState] Game Room active. Reconnecting socket and fetching state...");
        send("reconnect_match", { token, matchId });
        runHealthCheck();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);

    // Initial check
    runHealthCheck();

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isFocused, matchId, token, ensureConnected, emitAck, send, refreshProfile, safeReplace, stopSyncGuard]);

  // ---------- socket subscription ----------
  useEffect(() => {
    if (!matchId) return;

    const off = onMessage((msg: any) => {
      try {
        const type = msg?.type;
        const p = msg?.payload ?? {};

        // Any real match state should stop syncing gate
        const unlockIfState = () => stopSyncGuard();

        switch (type) {
          case "move_made": {
            // Ignore moves from a previous round (prevents stale board overwrite after draw)
            const moveRound = typeof p.round === "number" ? p.round : 1;
            if (moveRound < currentRoundRef.current) break;

            const nextBoard = Array.isArray(p.board) ? p.board : null;
            const nextTurn = isXO(p.turn) ? p.turn : null;
            const tmr = p?.timers;

            if (nextBoard && nextBoard.length === 9) {
              setBoard(nextBoard as BoardCell[]);
              boardRef.current = nextBoard as BoardCell[];
            }
            if (nextTurn) setTurn(nextTurn);
            if (tmr && typeof tmr.X === "number" && typeof tmr.O === "number") setTimers({ X: tmr.X, O: tmr.O });

            setLocked(false);
            unlockIfState();
            break;
          }

          case "timer_update": {
            const tmr = p?.timers;
            if (tmr && typeof tmr.X === "number" && typeof tmr.O === "number") setTimers({ X: tmr.X, O: tmr.O });
            unlockIfState();
            break;
          }

          case "resume_game":
          case "reconnected": {
            // sync full state
            const b = Array.isArray(p.board) && p.board.length === 9 ? (p.board as BoardCell[]) : null;
            const tr = isXO(p.turn) ? p.turn : null;
            const tmr = p?.timers;

            if (b) setBoard(b);
            if (tr) setTurn(tr);
            if (tmr && typeof tmr.X === "number" && typeof tmr.O === "number") setTimers({ X: tmr.X, O: tmr.O });

            if (isXO(p.symbol)) {
              setMySymbol(p.symbol);
              mySymbolRef.current = p.symbol;
            }
            if (typeof p.opponentUsername === "string" && p.opponentUsername.trim()) {
              setOpponent(p.opponentUsername);
              opponentRef.current = p.opponentUsername;
            }
            if (typeof p.opponentId === "string" && p.opponentId.trim()) {
              setOpponentId(p.opponentId);
              opponentIdRef.current = p.opponentId;
            }

            setLocked(false);
            hideResultOverlay(); // prevent stuck end overlay after reconnect
            unlockIfState();

            if (type === "reconnected") {
              setToast({
                msg: languageRef.current === "en" ? "Reconnected and synced." : "እንደገና ተገናኝቷል.",
                color: "#00e5ff",
                icon: "cloud-done",
              });
            }
            break;
          }

          case "new_round": {
            resetForNewGame({ keepIdentity: true });

            // Track current round so stale move_made events are ignored
            const newRound = typeof p.roundNumber === "number" ? p.roundNumber : (currentRoundRef.current + 1);
            currentRoundRef.current = newRound;

            // Ensure the board is always empty for a new round
            const b = ([...EMPTY_BOARD] as BoardCell[]);
            boardRef.current = b;
            const tr = isXO(p.turn) ? p.turn : "X";
            const tmr = p?.timers;

            setBoard(b);
            setTurn(tr);
            if (tmr && typeof tmr.X === "number" && typeof tmr.O === "number") setTimers({ X: tmr.X, O: tmr.O });

            if (isXO(p.symbol)) {
              setMySymbol(p.symbol);
              mySymbolRef.current = p.symbol;
            }
            if (typeof p.opponentUsername === "string" && p.opponentUsername.trim()) {
              setOpponent(p.opponentUsername);
              opponentRef.current = p.opponentUsername;
            }
            if (typeof p.opponentId === "string" && p.opponentId.trim()) {
              setOpponentId(p.opponentId);
              opponentIdRef.current = p.opponentId;
            }

            unlockIfState();
            showGameStartAlert();
            break;
          }

          case "match_starting": {
            // Just an informational event
            break;
          }

          case "match_started": {
            const b = Array.isArray(p.board) && p.board.length === 9 ? (p.board as BoardCell[]) : null;
            const tr = isXO(p.turn) ? p.turn : "X";
            const tmr = p?.timers;

            if (b) setBoard(b);
            setTurn(tr);
            if (tmr && typeof tmr.X === "number" && typeof tmr.O === "number") setTimers({ X: tmr.X, O: tmr.O });

            setIsGameActive(true);
            setLocked(false);
            unlockIfState();
            break;
          }

          case "match_found": {
            // new match => gate until we receive state on the new screen
            resetForNewGame({ keepIdentity: false });

            const { matchId: newMatchId, symbol, opponentId: oppId, opponentUsername, betAmount } = p || {};
            if (!newMatchId) {
              safeReplace("/home/gameplay");
              break;
            }

            // IMPORTANT: when navigating to new match, set syncing true
            startSyncGuard(1200);
            setLocked(false);

            safeReplace({
              pathname: "/game/room",
              params: {
                id: String(newMatchId),
                symbol: String(symbol || ""),
                vs: String(opponentUsername || ""),
                oppId: String(oppId || ""),
                amount: String(betAmount ?? params?.amount ?? ""),
                _k: String(Date.now()),
              },
            } as any);

            setTimeout(() => {
              showGameStartAlert();
            }, 250);

            break;
          }

          case "game_won": {
            const winnerSymbol = isXO(p.winnerSymbol) ? p.winnerSymbol : null;
            if (!winnerSymbol) return;

            const me = mySymbolRef.current;
            const meWon = winnerSymbol === me;

            triggerVibration();
            if (meWon) playWin();
            else playLose();

            // Detect winning line from board
            const WIN_COMBOS = [
              [0,1,2],[3,4,5],[6,7,8], // rows
              [0,3,6],[1,4,7],[2,5,8], // cols
              [0,4,8],[2,4,6]          // diags
            ];
            const currentBoard = boardRef.current;
            const wl = WIN_COMBOS.find(combo => {
              const [a,b,c] = combo;
              return currentBoard[a] !== '_' && currentBoard[a] === currentBoard[b] && currentBoard[b] === currentBoard[c];
            });
            if (wl) {
              setWinLine(wl);
              winLineAnim.setValue(0);
              Animated.timing(winLineAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
            }

            const amt = Number(params?.amount ?? 0) || 0;
            // Delay result overlay to show win line first
            setTimeout(() => {
              setResult({ visible: true, outcome: meWon ? "win" : "lose", amount: meWon ? (p?.prizeAmount || amt) : amt });
            }, wl ? 2000 : 0);

            setToast({
              msg: meWon ? tRef.current("victory") : tRef.current("defeat"),
              color: meWon ? "#00ffae" : "#ff6b6b",
              icon: meWon ? "trophy" : "close-circle",
            });

            refreshProfile?.();
            setIsGameActive(false);
            setLocked(true);
            unlockIfState();
            break;
          }

          case "game_draw": {
            triggerDrawFlash();
            setToast({ msg: tRef.current("draw"), color: "#ffd700", icon: "shuffle" });
            refreshProfile?.();
            setIsGameActive(false);
            setLocked(true);
            unlockIfState();
            break;
          }

          case "opponent_forfeited": {
            triggerVibration();
            playWin();

            const amt = Number(params?.amount ?? 0) || 0;
            setResult({ visible: true, outcome: "win", amount: p.prizeAmount || amt });

            setToast({
              msg: languageRef.current === "en" ? "Opponent forfeited. You win!" : "ተጫዋቹ ተሸንፏል! አሸነፋሽ!",
              color: "#00ffae",
              icon: "checkmark-done",
            });

            refreshProfile?.();
            setIsGameActive(false);
            setLocked(true);
            unlockIfState();
            break;
          }

          case "match_starting": {
            const delay = p?.startingInMs || 3000;
            setToast({
              msg: languageRef.current === "en" ? `Match starting in ${Math.round(delay / 1000)}s...` : `ጨዋታ በ ${Math.round(delay / 1000)} ሰከንድ ይጀምራል...`,
              color: "#00daf3",
              icon: "hourglass",
            });
            setLocked(false);
            setRematchOffer(null);
            setWaitingForRematch(false);
            stopSyncGuard(); // Force unlock when starting
            break;
          }

          case "rematch_offer": {
            setRematchOffer({
              visible: true,
              fromName: p.fromUsername || "Opponent",
              fromUserId: p.fromUserId,
              amount: p.amount,
            });
            // Close the Game Over / Victory screen so they can see the board and the rematch popup!
            setResult(r => ({ ...r, visible: false }));
            setToast({ msg: `${p.fromUsername || "Opponent"} wants a rematch!`, color: "#00E5FF", icon: "refresh" });
            break;
          }

          case "rematch_waiting": {
            setWaitingForRematch(true);
            setToast({ msg: "Waiting for opponent to accept rematch...", color: "#00E5FF", icon: "time" });
            break;
          }

          case "rematch_result": {
            if (!p.accepted) {
              setWaitingForRematch(false);
              const declinedMsg = languageRef.current === 'am' 
                ? `${opponentRef.current || 'Opponent'} ሸሽቷል! 🏃‍♂️💨` 
                : `${opponentRef.current || 'Opponent'} ran away scared! 🏃‍♂️💨`;
              setToast({ msg: declinedMsg, color: "#FF4B4B", icon: "walk" });
              
              // Auto-close game since opponent ran away
              setTimeout(() => {
                setResult((r) => ({ ...r, visible: false }));
                safeReplace("/home/gameplay");
              }, 2000);
            }
            break;
          }

          case "rematch_cancelled": {
             setWaitingForRematch(false);
             setRematchOffer(null);
             setToast({ msg: "Opponent left the match.", color: "#00daf3", icon: "walk" });
             break;
          }

          case "error": {
            const m = p?.message || "Unknown error";
            setLocked(false);
            stopSyncGuard();

            setToast({
              msg: languageRef.current === "en" ? `Error: ${m}` : `ስህተት: ${m}`,
              color: "#ff6b6b",
              icon: "alert-circle",
            });

            if (m.toLowerCase().includes("invalid game") || m.toLowerCase().includes("game expired")) {
              refreshProfile?.();
              setTimeout(() => {
                safeReplace("/home/gameplay");
              }, 2000);
            }
            break;
          }

          case "emoji_received": {
            setFloatingEmoji(p.emoji);
            setTimeout(() => setFloatingEmoji(null), 7000);
            break;
          }

          default:
            break;
        }
      } catch {}
    });

    return () => {
      try {
        off?.();
      } catch {}
    };
  }, [
    hideResultOverlay,
    matchId,
    onMessage,
    params?.amount,
    playLose,
    playWin,
    resetForNewGame,
    safeReplace,
    showGameStartAlert,
    startSyncGuard,
    stopSyncGuard,
    triggerDrawFlash,
    triggerVibration,
  ]);

  // ---------- actions ----------
  const isMyTurn = useMemo(() => isXO(turn) && turn === mySymbol, [turn, mySymbol]);

  const handleToggleSound = useCallback(async () => {
    playClick();
    try {
      await toggleGlobalMusic();
    } catch (e) {}
  }, [playClick, toggleGlobalMusic]);

  const handleLanguageToggle = useCallback(async () => {
    playClick();
    await switchLanguage();
  }, [playClick, switchLanguage]);

  const goProfile = useCallback(async () => {
    playClick();
    router.replace("/home/profile" as any);
  }, [playClick, router]);

  const leaveMatch = useCallback(async () => {
    playClick();
    // If the game is already over (result shown / board locked after win/lose/draw),
    // skip the forfeit warning and go home directly
    if (result.visible || locked) {
      try {
        if (opponentId) send("cancel_rematch", { token, opponentId });
      } catch {}
      setFloatingEmoji(null);
      setResult((r) => ({ ...r, visible: false }));
      safeReplace("/home/gameplay");
      return;
    }
    setLeaveConfirmVisible(true);
  }, [playClick, result.visible, locked, opponentId, send, token, safeReplace]);

  const confirmLeaveMatch = useCallback(async () => {
    try {
      if (opponentId) send("cancel_rematch", { token, opponentId });
    } catch {}
    try {
      send("leave_match", { token, matchId });
    } catch {}
    setFloatingEmoji(null);
    safeReplace("/home/gameplay");
  }, [matchId, safeReplace, send, token, opponentId]);

  const makeMove = useCallback(
    async (index: number) => {
      if (!matchId) return;

      // gate until we have at least some server state
      if (syncingRef.current) return;

      if (locked || !isMyTurn || board[index] !== "_") return;

      setLocked(true);
      playXO();
      haptics.tap();

      // Immediate optimistic update for zero-latency, silky game feel
      const optimisticBoard = [...board] as BoardCell[];
      optimisticBoard[index] = mySymbol;
      setBoard(optimisticBoard);
      boardRef.current = optimisticBoard;

      try {
        send("make_move", { matchId, index, symbol: mySymbol });
      } catch {
        setLocked(false);
      }
    },
    [board, isMyTurn, locked, matchId, mySymbol, playXO, send]
  );

  const goHome = useCallback(async () => {
    await playClick();
    try {
      if (opponentId) send("cancel_rematch", { token, opponentId });
    } catch {}
    setFloatingEmoji(null);
    setResult((r) => ({ ...r, visible: false }));
    safeReplace("/home/gameplay");
  }, [playClick, safeReplace, send, token, opponentId]);

  const handlePlayAgain = useCallback(async () => {
    await playClick();
    const amt = Number(params?.amount ?? 0);

    // Check balance before allowing rematch
    const userBalance = Number(user?.available_balance ?? 0) + Number(user?.bonus_balance ?? 0);
    if (userBalance < amt) {
      setToast({ msg: `Insufficient balance (ETB ${userBalance.toLocaleString()}) for this rematch`, color: "#FF4B4B", icon: "alert-circle" });
      return;
    }

    setResult((r) => ({ ...r, visible: false }));

    try {
      if (opponentId) {
        setWaitingForRematch(true);
        send("rematch_request", { token, opponentId, amount: amt });
        setToast({ msg: "Rematch offer sent!", color: "#00daf3", icon: "paper-plane" });
      } else {
        // Fallback: If for some reason opponentId is lost
        router.replace({
          pathname: "/game/waiting",
          params: {
            amount: String(amt),
            token: String(token || ""),
            _k: String(Date.now()),
          },
        } as any);
      }
    } catch (e) {
      console.log("Play again error:", e);
    }
  }, [params?.amount, playClick, router, send, token, opponentId, user?.available_balance, user?.bonus_balance]);

  const handleAcceptRematch = useCallback(async () => {
    await playClick();
    try {
      send("rematch_response", { token, opponentId: rematchOffer?.fromUserId, accept: true, amount: rematchOffer?.amount });
      setRematchOffer(null);
    } catch (e) { console.log(e); }
  }, [playClick, send, token, rematchOffer]);

  const handleDeclineRematch = useCallback(async () => {
    await playClick();
    try {
      send("rematch_response", { token, opponentId: rematchOffer?.fromUserId, accept: false, amount: rematchOffer?.amount });
      setRematchOffer(null);
    } catch (e) { console.log(e); }
  }, [playClick, send, token, rematchOffer]);

  const handleCancelRematch = useCallback(async () => {
    await playClick();
    try {
      send("cancel_rematch", { token, opponentId });
      setWaitingForRematch(false);
    } catch (e) { console.log(e); }
  }, [playClick, send, token, opponentId]);
  const betLabel = useMemo(() => {
    const amount = Number(params?.amount ?? 0);
    if (!amount) return "";
    return `WIN ETB ${calculateWinAmount(amount)}`;
  }, [params?.amount]);

  const getMyTimerColor = useCallback(
    (time: number) => {
      if (isMyTurn) {
        if (time <= 10) return "#ff6b6b";
        if (time <= 20) return "#ffa726";
      }
      return "#00e5ff";
    },
    [isMyTurn]
  );

  const getOpponentTimerColor = useCallback(
    (time: number) => {
      if (!isMyTurn) {
        if (time <= 10) return "#ff6b6b";
        if (time <= 20) return "#ffa726";
      }
      return "#00e5ff";
    },
    [isMyTurn]
  );

  const meName = user?.username || (language === "en" ? "You" : "እርስዎ");
  const meNumber = (user as any)?.number ? `+${(user as any).number}` : "";
  const oppName = opponent || (language === "en" ? "Opponent" : "ተጫዋች");

  const onAcceptRematch = useCallback(() => {
    if (!rematchOffer?.fromUserId) return;
    send("rematch_response", {
      token,
      opponentId: rematchOffer.fromUserId,
      amount: rematchOffer.amount,
      accept: true,
    });
    setRematchOffer(null);
  }, [rematchOffer, token, send]);

  const onDeclineRematch = useCallback(() => {
    if (!rematchOffer?.fromUserId) return;
    send("rematch_response", {
      token,
      opponentId: rematchOffer.fromUserId,
      amount: rematchOffer.amount,
      accept: false,
    });
    setRematchOffer(null);
  }, [rematchOffer, token, send]);

  // ---------- Render ----------
  const MainWrapper = Platform.OS === 'web' ? View : SafeAreaView;

  // Guard: If we don't have a valid matchId yet, show a loader.
  // We check for falsy AND for literal "undefined"/"null" strings which can happen during transition races.
  if (!matchId || matchId === "undefined" || matchId === "null") {
    return (
      <View style={[styles.container, { backgroundColor: '#060814', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00daf3" />
        <Text style={{ color: '#fff', marginTop: 16, fontWeight: '600' }}>Initializing Game Room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />}
      
      {/* Background Decor */}
      {isDesktop && (
        <>
          <View style={[styles.glowBg, { top: '5%', left: '5%', width: 500, height: 500, backgroundColor: 'rgba(0,218,243,0.06)' }]} />
          <View style={[styles.glowBg, { bottom: '5%', right: '5%', width: 400, height: 400, backgroundColor: 'rgba(0,218,243,0.04)' }]} />
        </>
      )}

      {/* Background XO Illustrations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Text style={{ position: 'absolute', top: '15%', left: '-10%', fontSize: 240, fontWeight: '900', color: '#00daf3', opacity: 0.03, transform: [{ rotate: '-15deg' }] }}>X</Text>
        <Text style={{ position: 'absolute', bottom: '20%', right: '-15%', fontSize: 280, fontWeight: '900', color: '#00daf3', opacity: 0.02, transform: [{ rotate: '25deg' }] }}>O</Text>
      </View>

      <FlashToast amount={parseInt(amountParam)} ref={toastRef} message="Match Found! 🎉" />

      <MainWrapper style={styles.safe}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

          {/* MAIN GAME LAYOUT */}
          <View style={[isDesktop && { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 40 }]}>
            {/* LEFT COLUMN: Player 1 (On mobile, this acts as the Top Bar) */}
            <View style={[isDesktop ? { flex: 1, alignItems: 'flex-end', paddingRight: 40 } : styles.topBar]}>
              <PlayerBadge
                name={languageRef.current === "en" ? "You" : "አንተ"}
                isMe={true}
                sub={user?.number || ""}
                symbol={mySymbol}
                time={timers[mySymbol]}
                active={turn === mySymbol}
                timerColor="#fff"
                avatar={user?.avatar}
              />

              {!isDesktop && (
                <View style={styles.betWrapper}>
                  <View style={[styles.betPill, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                    <Ionicons name="trophy" size={14} color="#ffd700" />
                    <Text style={styles.betText}>PRIZE: {calculateWinAmount(Number(amountParam))} ETB</Text>
                  </View>
                </View>
              )}

              {!isDesktop && (
                <PlayerBadge
                  name={opponent}
                  isMe={false}
                  sub=""
                  symbol={mySymbol === "X" ? "O" : "X"}
                  time={timers[mySymbol === "X" ? "O" : "X"]}
                  active={turn !== mySymbol}
                  timerColor="#fff"
                  avatar={(params as any)?.opponentAvatar}
                />
              )}
            </View>

            {/* CENTER COLUMN: Bet (Desktop), Turn Banner, Board */}
            <View style={[isDesktop && { alignItems: 'center' }]}>
              {isDesktop && (
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View style={[styles.betPill, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                    <Ionicons name="trophy" size={14} color="#ffd700" />
                    <Text style={styles.betText}>PRIZE: {calculateWinAmount(Number(amountParam))} ETB</Text>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.turnBanner,
                  {
                    backgroundColor: isMyTurn ? "rgba(0,218,243,0.08)" : "rgba(0, 200, 255, 0.08)",
                    borderColor: isMyTurn ? "rgba(0,218,243,0.2)" : "rgba(0, 200, 255, 0.2)",
                    opacity: bannerGlowOpacity,
                    maxWidth: isDesktop ? 600 : 'auto',
                    alignSelf: isDesktop ? 'center' : 'auto',
                    width: isDesktop ? '100%' : 'auto',
                  },
                ]}
              >
                <Ionicons name={isMyTurn ? "sparkles" : "hourglass"} size={16} color="#00daf3" />
                <Text style={[styles.turnText, { color: isMyTurn ? "#00daf3" : "rgba(255,255,255,0.8)" }]}>
                  {isMyTurn ? t("your_turn") : t("opponent_turn")}
                </Text>
              </View>

              <View style={[styles.boardSection, { alignItems: 'center' }, isDesktop && { justifyContent: 'center' }]}>
                <View style={[styles.boardContainer, { width: boardOuterSize, height: boardOuterSize, padding: 24, backgroundColor: 'rgba(17,17,40,0.6)' }]}>
                  <View style={styles.boardGlowLayer} />
                  <View style={[styles.mainBoard, { width: boardInnerSize, height: boardInnerSize }]}>
                    {[0, 1, 2].map((r) => (
                      <View key={r} style={styles.boardRow}>
                        {[0, 1, 2].map((c) => {
                          const idx = r * 3 + c;
                          const isWinning = !!(winLine && winLine.includes(idx));
                          return (
                            <BoardCell
                              key={idx}
                              index={idx}
                              symbol={board[idx]}
                              isMyTurn={isMyTurn}
                              mySymbol={mySymbol}
                              cellSize={dynamicCellSize}
                              isDesktop={isDesktop}
                              isWinning={isWinning}
                              onPress={makeMove}
                            />
                          );
                        })}
                      </View>
                    ))}

                    {/* Win Line Overlay */}
                    {winLine && (() => {
                      const cellSize = (boardInnerSize - 24) / 3;
                      const getCenter = (idx: number) => {
                        const col = idx % 3;
                        const row = Math.floor(idx / 3);
                        return {
                          x: col * (cellSize + 12) + cellSize / 2,
                          y: row * (cellSize + 12) + cellSize / 2
                        };
                      };
                      const p1 = getCenter(winLine[0]);
                      const p2 = getCenter(winLine[2]);
                      const dx = p2.x - p1.x;
                      const dy = p2.y - p1.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      const winSymbol = board[winLine[0]];
                      const lineColor = winSymbol === 'X' ? '#fd6f85' : '#00daf3';
                      return (
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            left: p1.x,
                            top: p1.y - 3,
                            width: winLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, length] }),
                            height: 6,
                            backgroundColor: lineColor,
                            borderRadius: 3,
                            transform: [
                              { translateX: 0 },
                              { translateY: 0 },
                              { rotate: `${angle}deg` }
                            ],
                            transformOrigin: 'left center',
                            shadowColor: lineColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 10,
                            zIndex: 10,
                          }}
                        />
                      );
                    })()}
                  </View>
                </View>
              </View>
            </View>

            {/* RIGHT COLUMN: Player 2 (Desktop only, mobile renders in Top Bar) */}
            {isDesktop && (
              <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 40 }}>
                <PlayerBadge
                  name={opponent}
                  isMe={false}
                  sub=""
                  symbol={mySymbol === "X" ? "O" : "X"}
                  time={timers[mySymbol === "X" ? "O" : "X"]}
                  active={turn !== mySymbol}
                  timerColor="#fff"
                  avatar={(params as any)?.opponentAvatar}
                />
              </View>
            )}
          </View>

          {/* Floating Emoji - Top notification */}
          {floatingEmoji && (
            <View style={{
              position: 'absolute',
              top: 10,
              left: 0,
              right: 0,
              zIndex: 99999,
              elevation: 100,
              alignItems: 'center',
              pointerEvents: 'none',
            }}>
              {EMOJI_GIFS[floatingEmoji] ? (
                <Image 
                  source={{ uri: EMOJI_GIFS[floatingEmoji] }} 
                  style={{ width: 100, height: 100 }} 
                  resizeMode="contain" 
                />
              ) : (
                <Text style={{ fontSize: 80, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 }}>
                  {floatingEmoji}
                </Text>
              )}
            </View>
          )}

          {/* Waiting for Rematch UI */}
          {waitingForRematch && (
            <View style={{
              alignSelf: 'center',
              backgroundColor: 'rgba(124, 58, 237, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(124, 58, 237, 0.4)',
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 20,
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12
            }}>
              <ActivityIndicator color="#00daf3" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                Waiting for {opponent} to accept...
              </Text>
            </View>
          )}

          {/* Emoji Quick Actions */}
          {!result.visible && !waitingForRematch && (
            <View style={{ marginTop: 24, marginBottom: 8 }}>
              <EmojiBar
                onSend={(emoji) => {
                  send("send_emoji", { matchId, emoji });
                  setFloatingEmoji(emoji);
                  setTimeout(() => setFloatingEmoji(null), 3000);
                }}
              />
            </View>
          )}

          {/* BOTTOM UI */}
          <View style={[styles.bottomBar, isDesktop && { width: 520, alignSelf: 'center', borderTopWidth: 0, paddingTop: 40, paddingBottom: 40 }]}>
            <WebPressable onPress={handleToggleSound} style={styles.iconMini}>
              <Ionicons name={bgMusicOn ? "volume-high" : "volume-mute"} size={14} color="#a8a7d4" />
            </WebPressable>
            <WebPressable onPress={handleLanguageToggle} style={styles.languageBtn}>
              <Text style={styles.languageText}>{language === "en" ? "EN" : "አማ"}</Text>
            </WebPressable>
            <WebPressable onPress={leaveMatch} style={styles.leaveBtn}>
              <Ionicons name="exit-outline" size={14} color="#fd6f85" />
              <Text style={styles.leaveText}>{t("leave_match")}</Text>
            </WebPressable>
          </View>

          <GameStartAlert
            visible={isFocused && gameStartAlert}
            scale={gameStartScale}
            opacity={gameStartOpacity}
            language={language}
            betAmount={params?.amount}
          />

          <Toast
            visible={isFocused && !!toast}
            message={toast?.msg || ""}
            color={toast?.color}
            icon={toast?.icon as any}
            onHide={() => setToast(null)}
          />

          {drawFlash && (
            <Animated.View pointerEvents="none" style={[styles.drawFlash, { opacity: drawOpacity }]}>
              <View style={[styles.drawFlashInner, { backgroundColor: '#303244' }]}>
                <Ionicons name="shuffle" size={18} color="#ffd700" />
                <Text style={styles.drawFlashText}>
                  {language === "en" ? "Draw — next round…" : "ተመሳሳይ — ቀጣዩ ሙከራ…"}
                </Text>
              </View>
            </Animated.View>
          )}

          <ResultOverlay
            key={`result-${matchId}`}
            visible={isFocused && result.visible}
            outcome={result.outcome}
            amount={result.amount}
            onHome={goHome}
            onPlayAgain={handlePlayAgain}
            onSendEmoji={(emoji) => {
              send("send_emoji", { matchId, emoji });
              setFloatingEmoji(emoji);
              setTimeout(() => setFloatingEmoji(null), 3000);
            }}
            insufficientBalance={(Number(user?.available_balance ?? 0) + Number(user?.bonus_balance ?? 0)) < Number(params?.amount ?? 0)}
          />

          <RematchOfferModal
            visible={isFocused && rematchOffer?.visible === true}
            fromName={rematchOffer?.fromName}
            amount={rematchOffer?.amount}
            onAccept={handleAcceptRematch}
            onDecline={handleDeclineRematch}
          />

          {waitingForRematch && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)' }}>
              <View style={{ width: '94%', maxWidth: 480, backgroundColor: 'rgba(13, 16, 32, 0.98)', borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: '#00e5ff', alignItems: 'center', shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 }}>
                <ActivityIndicator size="large" color="#00e5ff" style={{ marginBottom: 16 }} />
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
                  {language === 'am' ? 'ተጋጣሚውን በመጠበቅ ላይ...' : 'Waiting for opponent to accept rematch...'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  {language === 'am' ? 'እባክዎን ይጠብቁ' : 'Offer sent! Waiting for response...'}
                </Text>
                <WebPressable
                  onPress={handleCancelRematch}
                  activeScale={0.96}
                  style={{ paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16, backgroundColor: 'rgba(255,107,107,0.15)', borderWidth: 1, borderColor: '#ff6b6b' }}
                >
                  <Text style={{ color: '#ff6b6b', fontWeight: '900', fontSize: 14 }}>{language === 'am' ? 'ሰርዝ' : 'Cancel Request'}</Text>
                </WebPressable>
              </View>
            </View>
          )}

          <LeaveGameConfirmation
            visible={leaveConfirmVisible}
            onCancel={() => setLeaveConfirmVisible(false)}
            onConfirm={confirmLeaveMatch}
            stakeAmount={Number(params?.amount ?? 0)}
          />
        </ScrollView>
      </MainWrapper>
    </View>
  );
}

// ---------------- Game Start Alert Component ----------------
function GameStartAlert({
  visible,
  scale,
  opacity,
  language,
  betAmount,
}: {
  visible: boolean;
  scale: Animated.Value;
  opacity: Animated.Value;
  language: string;
  betAmount?: string;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" presentationStyle="overFullScreen">
      <View style={styles.gameStartOverlay}>
        <Animated.View style={[styles.gameStartAlert, { transform: [{ scale }], opacity }]}>
          <View style={[styles.gameStartGradient, { backgroundColor: '#764ba2' }]}>
            <View style={styles.gameStartIconContainer}>
              <View style={[styles.gameStartIconBackground, { backgroundColor: '#ffd700' }]}>
                <Ionicons name="play" size={32} color="#764ba2" />
              </View>
            </View>

            <View style={styles.gameStartContent}>
              <Text style={styles.gameStartTitle}>{language === "en" ? "Game Started!" : "ጨዋታው ጀመር!"}</Text>
              <Text style={styles.gameStartSubtitle}>{language === "en" ? "Good luck! 🎯" : "መልካም ዕድል! 🎯"}</Text>

              {betAmount && (
                <View style={styles.betAmountContainer}>
                  <Ionicons name="trophy" size={14} color="#ffd700" />
                  <Text style={styles.betAmountText}>ETB {betAmount}</Text>
                </View>
              )}
            </View>

            <View style={styles.gameStartDecor1} />
            <View style={styles.gameStartDecor2} />
            <View style={styles.gameStartDecor3} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------- Rematch Offer Modal Component ----------------
function RematchOfferModal({
  visible,
  fromName,
  amount,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  fromName?: string;
  amount?: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [countdown, setCountdown] = React.useState(10);
  const slideAnim = React.useRef(new Animated.Value(-120)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visible) {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
      setCountdown(10);
      return;
    }
    // Slide in from top
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // 10s countdown
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <Animated.View style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        width: '94%',
        maxWidth: 480,
        backgroundColor: 'rgba(13, 16, 32, 0.98)',
        borderRadius: 24,
        padding: 22,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 229, 255, 0.4)',
        shadowColor: '#00e5ff',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(0, 229, 255, 0.15)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="game-controller" size={22} color="#00e5ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 }}>
              {fromName || 'Opponent'} wants a rematch!
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
              Same stake: <Text style={{ color: '#00e5ff', fontWeight: '900' }}>ETB {Number(amount || 0).toLocaleString()}</Text>
            </Text>
          </View>
          {/* Timer */}
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: countdown <= 3 ? 'rgba(255,107,107,0.2)' : 'rgba(0,229,255,0.1)',
            borderWidth: 2,
            borderColor: countdown <= 3 ? '#ff6b6b' : '#00e5ff',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: countdown <= 3 ? '#ff6b6b' : '#00e5ff', fontSize: 17, fontWeight: '900' }}>
              {countdown}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <WebPressable
            onPress={onDecline}
            activeScale={0.96}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#ff6b6b', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>Nah, skip</Text>
          </WebPressable>
          <WebPressable
            onPress={onAccept}
            activeScale={0.96}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#00e5ff', alignItems: 'center', justifyContent: 'center', shadowColor: '#00e5ff', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
          >
            <Text style={{ color: '#0a0d1a', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>⚡ Let's Go!</Text>
          </WebPressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------- Subcomponents ----------------
function PlayerBadge({
  name,
  sub,
  symbol,
  time,
  active,
  timerColor,
  avatar,
  isMe,
}: {
  name: string;
  isMe?: boolean;
  sub?: string;
  symbol: "X" | "O";
  time: number;
  active?: boolean;
  labelLeft?: boolean;
  timerColor: string;
  avatar?: string | null;
}) {
  const { fixUrl, language } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isX = symbol === "X";
  const accent = isX ? (isDesktop ? "#fd6f85" : "#FF6B6B") : (isDesktop ? "#00daf3" : "#00E5FF");
  const accentSoft = isX ? (isDesktop ? "rgba(253,111,133,0.16)" : "rgba(255,107,107,0.16)") : (isDesktop ? "rgba(0,218,243,0.16)" : "rgba(0,229,255,0.16)");
  const ring = isX ? (isDesktop ? "rgba(253,111,133,0.45)" : "rgba(255,107,107,0.45)") : (isDesktop ? "rgba(0,218,243,0.45)" : "rgba(0,229,255,0.45)");
  const ring2 = "rgba(255,255,255,0.12)";

  return (
    <View style={[styles.playerCard, active && styles.playerCardActive]}>
      {/* soft accent wash */}
      <View style={[styles.playerAccentWash, { backgroundColor: accentSoft }]} />

      {/* Row 1: Avatar + Name (lots of space!) */}
      <View style={styles.playerRow}>
        {/* Avatar (ringed) */}
        <View style={[styles.avatarRing, { borderColor: ring }]}>
          <View style={[styles.avatarRingInner, { borderColor: ring2 }]}>
            <View style={[styles.avatarCore, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
              {avatar ? (
                <Image source={{ uri: fixUrl(avatar) || undefined }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
              ) : (
                <Ionicons name="person" size={16} color="rgba(255,255,255,0.90)" />
              )}
            </View>

            {/* tiny status dot */}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: active ? accent : "rgba(255,255,255,0.28)" },
              ]}
            />
          </View>
        </View>

        {/* Text */}
        <View style={styles.playerTextCol}>
          <Text 
            style={[styles.playerName, isMe && { color: accent, fontWeight: '900'}]} 
            numberOfLines={2} 
            adjustsFontSizeToFit 
            minimumFontScale={0.75}
          >
            {isMe ? `${language === 'en' ? 'YOU' : 'እርስዎ'} (${name})` : name}
          </Text>

          <View style={styles.playerMetaRow}>
            {active ? (
              <>
                <View style={[styles.turnDot, { backgroundColor: accent, marginLeft: 0, shadowOpacity: 1, shadowRadius: 6, shadowColor: accent }]} />
                <Text style={[styles.playerSub, { color: accent, fontWeight: '900'}]} numberOfLines={1}>
                  {name === "You" || name === "እርስዎ" ? "Your turn" : "Opponent turn"}
                </Text>
              </>
            ) : !!sub ? (
              <>
                <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.55)" />
                <Text style={styles.playerSub} numberOfLines={1}>
                  {sub}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={12} color="rgba(255,255,255,0.40)" />
                <Text style={[styles.playerSub, { color: "rgba(255,255,255,0.45)" }]} numberOfLines={1}>
                  {symbol === "X" ? "Red side" : "Blue side"}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Row 2: Timer + Symbol */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <View
          style={[
            styles.timerPill,
            { borderColor: ring, backgroundColor: accentSoft, marginTop: 0 },
          ]}
        >
          <Ionicons name="time-outline" size={14} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>
            {Math.max(0, Number.isFinite(time) ? time : 0)}s
          </Text>
          {active && (
            <View style={[styles.turnDot, { backgroundColor: accent }]} />
          )}
        </View>
        <SymbolPill symbol={symbol} active={active} />
      </View>
    </View>
  );
}


function SymbolPill({ symbol, active }: { symbol: "X" | "O"; active?: boolean }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isX = symbol === "X";
  const accent = isX ? (isDesktop ? "#fd6f85" : "#FF6B6B") : (isDesktop ? "#00daf3" : "#00E5FF");
  const bg = isX ? (isDesktop ? "rgba(253,111,133,0.14)" : "rgba(255,107,107,0.14)") : (isDesktop ? "rgba(0,218,243,0.14)" : "rgba(0,229,255,0.14)");
  const border = isX ? (isDesktop ? "rgba(253,111,133,0.30)" : "rgba(255,107,107,0.30)") : (isDesktop ? "rgba(0,218,243,0.30)" : "rgba(0,229,255,0.30)");

  return (
    <View style={[styles.symbolPill, { backgroundColor: bg, borderColor: border, opacity: active ? 1 : 0.75 }]}>
      <Ionicons name={isX ? "close" : "radio-button-off"} size={14} color={accent} />
      <Text style={[styles.symbolText, { color: accent }]}>{symbol}</Text>
    </View>
  );

}


// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c1f" },
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  safe: { flex: 1, backgroundColor: "transparent" },

  glowBg: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },

  topBar: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    justifyContent: 'space-between',
    gap: 4, 
    marginHorizontal: 8,
    marginTop: 8,
  },

  playerCard: {
    flex: 1,
    borderRadius: 16,
    padding: 6,
    overflow: "hidden",
    backgroundColor: "rgba(17,17,40,0.6)",
    borderWidth: 1,
    borderColor: "rgba(166,139,255,0.15)",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  playerCardActive: {
    borderColor: "rgba(166,139,255,0.4)",
    backgroundColor: "rgba(28,28,60,0.8)",
  },

  playerAccentWash: {
    position: "absolute",
    top: -18,
    left: -18,
    width: 120,
    height: 120,
    borderRadius: 999,
    opacity: 0.9,
  },

  playerRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  avatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  avatarRingInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  statusDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
  },

  playerTextCol: { flex: 1, minWidth: 0 },

  playerName: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexShrink: 1,
  },

  playerMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },

  playerSub: {
    color: "rgba(168,167,212,0.7)",
    fontSize: 11,
    fontWeight: "700",
  },

  symbolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },

  symbolText: { fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },

  timerPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  timerText: {
    fontWeight: "900",
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },

  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
    opacity: 1,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },


  betWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
  },

  betPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.8)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  betText: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  turnBanner: {
    marginTop: 20,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
  },

  turnText: {
    fontWeight: "900",
    flex: 1,
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  boardSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  boardContainer: {
    padding: 24,
    borderRadius: 40,
    backgroundColor: 'rgba(23, 23, 50, 0.4)', // Glassmorphism backdrop
    borderWidth: 1,
    borderColor: 'rgba(166, 140, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } as any : {})
  },

  boardGlowLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(166,139,255,0.02)',
  },

  mainBoard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 12,
  },

  boardRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 11, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { 
      transition: 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    } as any : {})
  },

  cellEmptyActive: {
    borderColor: 'rgba(0, 218, 243, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {})
  },

  cellText: {
    fontWeight: '900',
  },
  turnCellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00daf3',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 5,
    margin: 'auto',
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? { animation: 'turnDotPulse 2s infinite ease-in-out' } as any : {})
  },

  neonOText: {
    color: '#00daf3',
    fontSize: 56,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 218, 243, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  neonXText: {
    color: '#fd6f85',
    fontSize: 56,
    fontWeight: '900',
    textShadowColor: 'rgba(253, 111, 133, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  neonOShadow: {
    textShadowColor: 'rgba(0, 218, 243, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  neonXShadow: {
    textShadowColor: 'rgba(253, 111, 133, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },


  oMobileText: { color: "#00daf3", fontSize: 48, fontWeight: '900' },
  xMobileText: { color: "#fd6f85", fontSize: 48, fontWeight: '900' },

  bottomBar: {
    marginTop: 'auto',
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
  },

  iconMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(28,28,60,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(166,139,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(166,139,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  languageText: { color: "#e5e3ff", fontWeight: "900", fontSize: 13, letterSpacing: 1 },

  leaveBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(253,111,133,0.1)",
    borderWidth: 1,
    borderColor: "rgba(253,111,133,0.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  leaveText: { color: "#fd6f85", fontWeight: "900", fontSize: 13 },

  drawFlash: { position: "absolute", left: 16, right: 16, top: 16, alignItems: "center" },
  drawFlashInner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  drawFlashText: { color: "#E5E7EB", fontWeight: "800" },

  gameStartOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
  },
  gameStartAlert: {
    width: 280,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gameStartGradient: { padding: 24, alignItems: "center", position: "relative" },
  gameStartIconContainer: { marginBottom: 16 },
  gameStartIconBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  gameStartContent: { alignItems: "center" },
  gameStartTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  gameStartSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  betAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  betAmountText: { color: "#ffd700", fontSize: 14, fontWeight: "800" },
  gameStartDecor1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  gameStartDecor2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  gameStartDecor3: {
    position: "absolute",
    top: "50%",
    left: "10%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
