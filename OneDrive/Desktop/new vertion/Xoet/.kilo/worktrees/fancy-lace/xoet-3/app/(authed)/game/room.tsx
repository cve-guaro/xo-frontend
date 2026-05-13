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
} from "react-native";
import Toast from "../../../components/Toast";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import FlashToast, { MatchFoundToastHandle } from "../../../components/game/FlashToast";
import RematchTopPopup from "../../../components/game/RematchPopup";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";

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
  let cut = 0.2; // Room 1 (Starter) - 20% cut
  if (amount >= 100 && amount < 1000) cut = 0.15; // Room 2 (Pro) - 15% cut
  else if (amount >= 1000) cut = 0.1; // Room 3 (Legend) - 10% cut
  return Math.floor(amount * 2 * (1 - cut));
}

export default function GameRoom() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    symbol?: "X" | "O" | string;
    vs?: string;
    amount?: string;
    _k?: string;
    time?: string;
  }>();

  const { user, token, language, switchLanguage, t, refreshProfile, fixUrl } = useAuth();
  const { onMessage, send } = useSocket();

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
  const initialOpponentId = useMemo(() => String(params?.vs ?? ""), [params?.vs]);

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
  const { isPlaying: bgMusicOn, toggleMusic: toggleGlobalMusic } = useBackgroundMusic();
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

  // Draw flash
  const [drawFlash, setDrawFlash] = useState(false);
  const drawOpacity = useRef(new Animated.Value(0)).current;

  // Game start alert
  const [gameStartAlert, setGameStartAlert] = useState(false);
  const gameStartScale = useRef(new Animated.Value(0.8)).current;
  const gameStartOpacity = useRef(new Animated.Value(0)).current;

  // Vibration guard
  const vibrationRef = useRef(false);

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

  // turn banner pulse
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  const bannerGlowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] });

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
            const nextBoard = Array.isArray(p.board) ? p.board : null;
            const nextTurn = isXO(p.turn) ? p.turn : null;
            const tmr = p?.timers;

            if (nextBoard && nextBoard.length === 9) setBoard(nextBoard as BoardCell[]);
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

            // Ensure the board is always empty for a new round
            const b = ([...EMPTY_BOARD] as BoardCell[]);
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
                vs: String(opponentUsername || oppId || ""),
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

            const amt = Number(params?.amount ?? 0) || 0;
            setResult({ visible: true, outcome: meWon ? "win" : "lose", amount: meWon ? (p?.prizeAmount || amt) : amt });

            setToast({
              msg: meWon ? tRef.current("victory") : tRef.current("defeat"),
              color: meWon ? "#00ffae" : "#ff6b6b",
              icon: meWon ? "trophy" : "close-circle",
            });

            refreshProfile?.();
            setLocked(true);
            unlockIfState();
            break;
          }

          case "game_draw": {
            triggerDrawFlash();
            setToast({ msg: tRef.current("draw"), color: "#ffd700", icon: "shuffle" });
            refreshProfile?.();
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
            setLocked(true);
            unlockIfState();
            break;
          }

          case "match_starting": {
            const delay = p?.startingInMs || 3000;
            setToast({
              msg: languageRef.current === "en" ? `Match starting in ${Math.round(delay / 1000)}s...` : `ጨዋታ በ ${Math.round(delay / 1000)} ሰከንድ ይጀምራል...`,
              color: "#a68bff",
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
              setToast({ msg: "Opponent declined rematch.", color: "#FF4B4B", icon: "close-circle" });
            }
            break;
          }

          case "rematch_cancelled": {
             setWaitingForRematch(false);
             setRematchOffer(null);
             setToast({ msg: "Opponent left the match.", color: "#ffabf3", icon: "walk" });
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
    setLeaveConfirmVisible(true);
  }, [playClick]);

  const confirmLeaveMatch = useCallback(async () => {
    try {
      if (opponentId) send("cancel_rematch", { token, opponentId });
    } catch {}
    try {
      send("leave_match", { token, matchId });
    } catch {}
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
    setResult((r) => ({ ...r, visible: false }));
    safeReplace("/home/gameplay");
  }, [playClick, safeReplace, send, token, opponentId]);

  const handlePlayAgain = useCallback(async () => {
    await playClick();
    const amt = Number(params?.amount ?? 0);
    setResult((r) => ({ ...r, visible: false }));

    try {
      if (opponentId) {
        setWaitingForRematch(true);
        send("rematch_request", { token, opponentId, amount: amt });
        setToast({ msg: "Rematch offer sent!", color: "#7C3AED", icon: "paper-plane" });
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
  }, [params?.amount, playClick, router, send, token, opponentId]);

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
      accepted: true,
    });
    setRematchOffer(null);
  }, [rematchOffer, token, send]);

  const onDeclineRematch = useCallback(() => {
    if (!rematchOffer?.fromUserId) return;
    send("rematch_response", {
      token,
      opponentId: rematchOffer.fromUserId,
      amount: rematchOffer.amount,
      accepted: false,
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
        <ActivityIndicator size="large" color="#a68cff" />
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
          <View style={[styles.glowBg, { top: '5%', left: '5%', width: 500, height: 500, backgroundColor: 'rgba(166,139,255,0.06)' }]} />
          <View style={[styles.glowBg, { bottom: '5%', right: '5%', width: 400, height: 400, backgroundColor: 'rgba(0,218,243,0.04)' }]} />
        </>
      )}

      <MainWrapper style={styles.safe}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          
          <RematchTopPopup
            visible={!!rematchOffer?.visible}
            fromName={rematchOffer?.fromName}
            amount={rematchOffer?.amount}
            onAccept={onAcceptRematch}
            onDecline={onDeclineRematch}
          />

          <FlashToast amount={parseInt(amountParam)} ref={toastRef} message="Match Found! 🎉" />

          {/* TOP BAR */}
          <View style={[styles.topBar, isDesktop && { paddingHorizontal: 40, marginTop: 24 }]}>
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

            <View style={styles.betWrapper}>
              <View style={[styles.betPill, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                <Ionicons name="trophy" size={14} color="#ffd700" />
                <Text style={styles.betText}>PRIZE: {calculateWinAmount(Number(amountParam))} ETB</Text>
              </View>
            </View>

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

          {/* TURN BANNER */}
          <Animated.View
            style={[
              styles.turnBanner,
              {
                backgroundColor: isMyTurn ? "rgba(166,139,255,0.08)" : "rgba(0, 200, 255, 0.08)",
                borderColor: isMyTurn ? "rgba(166,139,255,0.2)" : "rgba(0, 200, 255, 0.2)",
                opacity: bannerGlowOpacity,
                maxWidth: isDesktop ? 600 : 'auto',
                alignSelf: isDesktop ? 'center' : 'auto',
                width: isDesktop ? '100%' : 'auto',
              },
            ]}
          >
            <Ionicons name={isMyTurn ? "sparkles" : "hourglass"} size={16} color={isMyTurn ? "#a68cff" : "#00daf3"} />
            <Text style={[styles.turnText, { color: isMyTurn ? "#e5e3ff" : "rgba(255,255,255,0.8)" }]}>
              {isMyTurn ? t("your_turn") : t("opponent_turn")}
            </Text>
          </Animated.View>

          {/* BOARD AREA */}
          <View style={[styles.boardSection, { alignItems: 'center' }, isDesktop && { flex: 1, justifyContent: 'center' }]}>
            <View style={[styles.boardContainer, { width: boardOuterSize, height: boardOuterSize, padding: 24, backgroundColor: 'rgba(17,17,40,0.6)' }]}>
              <View style={styles.boardGlowLayer} />
              <View style={[styles.mainBoard, { width: boardInnerSize, height: boardInnerSize }]}>
                {[0, 1, 2].map((r) => (
                  <View key={r} style={styles.boardRow}>
                    {[0, 1, 2].map((c) => {
                      const idx = r * 3 + c;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => makeMove(idx)}
                          style={({ pressed }) => [
                            styles.cell,
                            isDesktop && { width: dynamicCellSize, height: dynamicCellSize, borderRadius: 28 },
                            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                            board[idx] === "_" && isMyTurn && styles.cellEmptyActive
                          ]}
                        >
                          {board[idx] !== "_" ? (
                            <Ionicons 
                              name={board[idx] === "X" ? "close" : "radio-button-off"} 
                              size={isDesktop ? dynamicCellSize * 0.8 : dynamicCellSize * 0.85} 
                              color={board[idx] === "X" ? "#fd6f85" : "#00daf3"} 
                              style={isDesktop ? (board[idx] === "X" ? styles.neonXShadow : styles.neonOShadow) : {}}
                            />
                          ) : (
                            isMyTurn && (
                              <View style={[styles.turnCellDot, { backgroundColor: '#fff', opacity: 0.8 }]} />
                            )
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* BOTTOM UI */}
          <View style={[styles.bottomBar, isDesktop && { width: 520, alignSelf: 'center', borderTopWidth: 0, paddingTop: 40, paddingBottom: 40 }]}>
            <TouchableOpacity onPress={handleToggleSound} style={styles.iconMini}>
              <Ionicons name={bgMusicOn ? "volume-high" : "volume-mute"} size={14} color="#a8a7d4" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLanguageToggle} style={styles.languageBtn}>
              <Text style={styles.languageText}>{language === "en" ? "EN" : "አማ"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={leaveMatch} style={styles.leaveBtn}>
              <Ionicons name="exit-outline" size={14} color="#fd6f85" />
              <Text style={styles.leaveText}>{t("leave_match")}</Text>
            </TouchableOpacity>
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
          />

          <RematchOfferModal
            visible={isFocused && rematchOffer?.visible === true}
            fromName={rematchOffer?.fromName}
            amount={rematchOffer?.amount}
            onAccept={handleAcceptRematch}
            onDecline={handleDeclineRematch}
          />

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
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.gameStartOverlay}>
        <View style={styles.gameStartAlert}>
          <View style={[styles.gameStartGradient, { backgroundColor: '#202236' }]}>
            <Ionicons name="game-controller" size={48} color="#00e5ff" style={{ marginBottom: 16 }} />
            <Text style={[styles.gameStartTitle, { fontSize: 20 }]}>Rematch Challenge!</Text>
            <Text style={styles.gameStartSubtitle}>
              {fromName} wants to play again.
            </Text>
            {amount ? (
              <View style={[styles.betAmountContainer, { marginBottom: 20 }]}>
                <Ionicons name="trophy" size={14} color="#ffd700" />
                <Text style={styles.betAmountText}>Stake: ETB {amount.toFixed(2)}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <TouchableOpacity
                onPress={onDecline}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "rgba(255, 107, 107, 0.2)", alignItems: "center" }}
              >
                <Text style={{ color: "#ff6b6b", fontWeight: "900" }}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAccept}
                style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "rgba(0, 229, 255, 0.2)", alignItems: "center" }}
              >
                <Text style={{ color: "#00e5ff", fontWeight: "900" }}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
    backgroundColor: 'rgba(17,17,40,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(28,28,60,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cellEmptyActive: {
    borderColor: 'rgba(166,139,255,0.3)',
    backgroundColor: 'rgba(166,139,255,0.05)',
  },

  cellText: {
    fontWeight: '900',
  },
   turnCellDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    margin: 'auto',
    alignSelf: 'center',
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
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
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
