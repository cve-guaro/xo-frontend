// context/socketContext.tsx
import { API_URL } from "../config";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import io, { Socket } from "socket.io-client";
import { Platform, AppState, AppStateStatus } from "react-native";

type Msg = { type: string; payload?: any };
type Unsub = () => void;

export type SocketState = {
  isSearching: boolean;
  isGameActive: boolean;
  lastError: string | null;
};

export type SocketActions = {
  ensureConnected: (token?: string) => Promise<boolean>;
  send: (event: string, payload?: any) => void;
  emitAck: (event: string, payload: any, timeoutMs?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
  onMessage: (cb: (msg: Msg) => void) => Unsub;
  findMatch: (betMin: number, betMax?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
  cancelFind: () => Promise<{ ok: boolean }>;
  setIsGameActive: (active: boolean) => void;
};

export type SocketApi = SocketState & SocketActions;

const StateCtx = createContext<SocketState>(null as any);
const ActionCtx = createContext<SocketActions>(null as any);
const CombinedCtx = createContext<SocketApi>(null as any);

export const useSocketState = () => useContext(StateCtx);
export const useSocketActions = () => useContext(ActionCtx);
export const useSocket = () => useContext(CombinedCtx);

// ---- CONFIG ----
const URL = API_URL;
const ACK_TIMEOUT_MS = 6000;
const CONNECT_TIMEOUT_MS = 6000;

const SERVER_EVENTS = [
  "queue_status",
  "match_found",
  "match_starting",
  "match_started",
  "queue_timeout",
  "move_made",
  "timer_update",
  "new_round",
  "game_won",
  "game_draw",
  "opponent_forfeited",
  "reconnected",
  "resume_game",
  "error",
  "info",
  "rematch_offer",
  "rematch_waiting",
  "rematch_result",
  "rematch_cancelled",
  "emoji_received",
  "emoji_cooldown",
  "friend_invite_received",
  "friend_invite_result",
  "friend_invite_declined",
  "global_win",
  // Spin game events
  "spin:room_state",
  "spin:player_joined",
  "spin:player_left",
  "spin:countdown",
  "spin:locked",
  "spin:start",
  "spin:result",
  "spin:cancelled",
  "spin:stake_updated",
  "spin:error",
  "spin:voice_chunk",
  "spin:player_muted",
] as const;

type ServerEvent = (typeof SERVER_EVENTS)[number];

export function SocketProvider({
  children,
  token,
}: {
  children: React.ReactNode;
  token?: string;
}) {
  const sockRef = useRef<Socket | null>(null);

  // external subscribers (screen listeners)
  const listenersRef = useRef<Set<(msg: Msg) => void>>(new Set());

  // connection guard
  const connectInFlightRef = useRef<Promise<boolean> | null>(null);

  // forwarder ref so we can detach cleanly
  const forwardRef = useRef<Record<string, (payload: any) => void>>({});

  const [isSearching, setIsSearching] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const tokenRef = useRef<string | undefined>(token);
  useEffect(() => {
    tokenRef.current = token;
    // update auth on the live socket (no reconnect needed)
    const s = sockRef.current;
    if (s) {
      s.auth = {
        ...(s.auth || {}),
        token,
        platform: Platform.OS === "web" ? "web" : "mobile"
      };
    }
  }, [token]);

  const isConnected = useCallback(() => !!sockRef.current?.connected, []);

  // ---------- internal: create socket once ----------
  const getOrCreateSocket = useCallback((): Socket => {
    let s = sockRef.current;
    if (s) return s;

    s = io(URL, {
      autoConnect: false,
      transports: ["polling", "websocket"], // Start with polling and upgrade to websocket for robust connection upgrade without console warnings
      secure: !URL.includes('localhost'),
      // IMPORTANT: do NOT forceNew (it can churn engines on remount)
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 8,        // Was 5 — more resilient for flaky Ethiopian mobile networks
      reconnectionDelay: 1500,        // Base delay 1.5s
      reconnectionDelayMax: 10000,    // Cap at 10s (was 5s)
      randomizationFactor: 0.5,       // ±50% jitter to prevent thundering herd on server restart
      timeout: CONNECT_TIMEOUT_MS,
      extraHeaders: {
        "x-platform": Platform.OS === "web" ? "web" : "mobile"
      },
      auth: {
        token: tokenRef.current,
        platform: Platform.OS === "web" ? "web" : "mobile"
      },
    });

    // core listeners
    const onConnect = () => {
      // avoid redundant setState
      setLastError((prev) => (prev === null ? prev : null));
    };

    const onDisconnect = () => {
      // if socket drops, searching is false
      setIsSearching((prev) => (prev === false ? prev : false));
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // Forward server events → subscribers
    const makeForward = (type: ServerEvent) => (payload: any) => {
      if (type === "queue_status") {
        const searching = !!payload?.searching;
        setIsSearching((prev) => (prev === searching ? prev : searching));
      }

      if (type === "error") {
        const msg = payload?.message || "Unknown error";
        // Suppress confusing "Match already found" error bar as it's handled by match_found event
        if (!msg.toLowerCase().includes("already found")) {
          setLastError((prev) => (prev === msg ? prev : msg));
        }
      }

      // fanout
      listenersRef.current.forEach((fn) => {
        try {
          fn({ type, payload });
        } catch { }
      });
    };

    // attach + store so we can detach later
    for (const t of SERVER_EVENTS) {
      const fwd = makeForward(t);
      forwardRef.current[t] = fwd;
      s.on(t, fwd);
    }

    // store extra for cleanup
    forwardRef.current.__connect = onConnect as any;
    forwardRef.current.__disconnect = onDisconnect as any;

    sockRef.current = s;
    return s;
  }, []);

  // ---------- ensureConnected (no leaks, no stacked promises) ----------
  const ensureConnected = useCallback(async (jwt?: string): Promise<boolean> => {
    if (sockRef.current?.connected) return true;

    // reuse in-flight connect
    if (connectInFlightRef.current) return connectInFlightRef.current;

    const s = getOrCreateSocket();

    // update auth token
    const nextToken = jwt ?? tokenRef.current;
    if (nextToken) s.auth = { ...(s.auth || {}), token: nextToken };

    connectInFlightRef.current = new Promise<boolean>((resolve) => {
      let done = false;

      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        cleanup();
        resolve(ok);
      };

      const onOk = () => finish(true);
      const onErr = () => finish(false);

      const timer = setTimeout(() => onErr(), CONNECT_TIMEOUT_MS + 250);

      const cleanup = () => {
        clearTimeout(timer);
        s.off("connect", onOk);
        s.off("connect_error", onErr);
      };

      s.once("connect", onOk);
      s.once("connect_error", onErr);

      try {
        s.connect();
      } catch {
        onErr();
      }
    }).finally(() => {
      connectInFlightRef.current = null;
    });

    return connectInFlightRef.current;
  }, [getOrCreateSocket]);

  // ---------- Safe emit with ACK ----------
  const emitAck = useCallback(
    async (event: string, payload: any, timeoutMs = ACK_TIMEOUT_MS) => {
      const s = sockRef.current;
      if (!s || !s.connected) return { ok: false, error: "DISCONNECTED" as const };

      return new Promise<{ ok: boolean; data?: any; error?: string }>((resolve) => {
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          resolve({ ok: false, error: "TIMEOUT" });
        }, timeoutMs);

        try {
          s.emit(event, payload, (resp: any) => {
            if (done) return;
            done = true;
            clearTimeout(timer);

            if (resp && typeof resp === "object" && resp.ok) {
              resolve({ ok: true, data: resp.data });
            } else {
              resolve({ ok: false, error: resp?.error || "NACK" });
            }
          });
        } catch (err: any) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: false, error: err?.message || "EMIT_ERROR" });
        }
      });
    },
    []
  );

  // ---------- Public send ----------
  const send = useCallback((event: string, payload?: any) => {
    const s = sockRef.current;
    if (!s || !s.connected) return;
    try {
      s.emit(event, payload);
    } catch { }
  }, []);

  // ---------- find/cancel ----------
  const findMatch = useCallback(
    async (betMin: number, betMax?: number) => {
      const s = sockRef.current;
      if (!s || !s.connected) return { ok: false, error: "DISCONNECTED" };

      const tk = tokenRef.current;
      const finalMax = betMax !== undefined ? betMax : betMin;
      return emitAck("find_match", { token: tk, betMin, betMax: finalMax, betAmount: finalMax });
    },
    [emitAck]
  );

  const cancelFind = useCallback(async () => {
    setIsSearching(false);
    const s = sockRef.current;
    if (!s || !s.connected) {
      return { ok: true };
    }

    const tk = tokenRef.current;
    try {
      await emitAck("cancel_find_match", { token: tk });
    } catch {}

    return { ok: true };
  }, [emitAck]);

  // ---------- External subscription ----------
  const onMessage = useCallback((cb: (msg: Msg) => void): Unsub => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  // ---------- Auto-reconnect when app enters foreground ----------
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("[AppState] App entered foreground. Reconnecting socket...");
        ensureConnected().catch((err) => console.error("[AppState] reconnect failed:", err));
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [ensureConnected]);

  // ---------- Cleanup (CRITICAL: detach listeners to prevent stacking) ----------
  useEffect(() => {
    return () => {
      // best effort cancel
      Promise.resolve(cancelFind()).catch(() => { });

      const s = sockRef.current;
      if (s) {
        // detach server event forwards
        for (const t of SERVER_EVENTS) {
          const fwd = forwardRef.current[t];
          if (fwd) s.off(t, fwd);
        }
        // detach connect/disconnect handlers
        const onConnect = forwardRef.current.__connect as any;
        const onDisconnect = forwardRef.current.__disconnect as any;
        if (onConnect) s.off("connect", onConnect);
        if (onDisconnect) s.off("disconnect", onDisconnect);

        try {
          s.disconnect();
        } catch { }

        try {
          s.removeAllListeners();
        } catch { }
      }

      sockRef.current = null;
      listenersRef.current.clear();
      forwardRef.current = {};
      connectInFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state: SocketState = useMemo(
    () => ({
      isSearching,
      isGameActive,
      lastError,
    }),
    [isSearching, isGameActive, lastError]
  );

  const actions: SocketActions = useMemo(
    () => ({
      ensureConnected,
      send,
      emitAck,
      onMessage,
      findMatch,
      cancelFind,
      setIsGameActive,
    }),
    [ensureConnected, send, emitAck, onMessage, findMatch, cancelFind, setIsGameActive]
  );

  const combinedValue: SocketApi = useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions]
  );

  return (
    <ActionCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>
        <CombinedCtx.Provider value={combinedValue}>
          {children}
        </CombinedCtx.Provider>
      </StateCtx.Provider>
    </ActionCtx.Provider>
  );
}
