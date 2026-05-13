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
import { Platform } from "react-native";

type Msg = { type: string; payload?: any };
type Unsub = () => void;

type SocketApi = {
  ensureConnected: (token?: string) => Promise<boolean>;
  send: (event: string, payload?: any) => void;
  onMessage: (cb: (msg: Msg) => void) => Unsub;
  findMatch: (betAmount: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
  cancelFind: () => Promise<{ ok: boolean }>;
  isSearching: boolean;
  lastError: string | null;
};

const Ctx = createContext<SocketApi>(null as any);
export const useSocket = () => useContext(Ctx);

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
      transports: ["websocket", "polling"], // Force both for stability across Railway proxies
      secure: true,
      // IMPORTANT: do NOT forceNew (it can churn engines on remount)
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
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
        } catch {}
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
          s.timeout(timeoutMs).emit(event, payload, (resp: any) => {
            if (done) return;
            done = true;
            clearTimeout(timer);

            if (resp && resp.ok) resolve({ ok: true, data: resp.data });
            else resolve({ ok: false, error: resp?.error || "NACK" });
          });
        } catch {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: false, error: "EMIT_ERROR" });
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
    } catch {}
  }, []);

  // ---------- find/cancel ----------
  const findMatch = useCallback(
    async (betAmount: number) => {
      const s = sockRef.current;
      if (!s || !s.connected) return { ok: false, error: "DISCONNECTED" };

      // Prefer reading token from ref to avoid stale closure
      const tk = tokenRef.current;
      return emitAck("find_match", { token: tk, betAmount });
    },
    [emitAck]
  );

  const cancelFind = useCallback(async () => {
    const s = sockRef.current;
    if (!s || !s.connected) {
      setIsSearching((prev) => (prev === false ? prev : false));
      return { ok: true };
    }

    const tk = tokenRef.current;
    const res = await emitAck("cancel_find_match", { token: tk });

    if (res.ok) setIsSearching((prev) => (prev === false ? prev : false));
    return { ok: true };
  }, [emitAck]);

  // ---------- External subscription ----------
  const onMessage = useCallback((cb: (msg: Msg) => void): Unsub => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  // ---------- Cleanup (CRITICAL: detach listeners to prevent stacking) ----------
  useEffect(() => {
    return () => {
      // best effort cancel
      Promise.resolve(cancelFind()).catch(() => {});

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
        } catch {}

        try {
          s.removeAllListeners();
        } catch {}
      }

      sockRef.current = null;
      listenersRef.current.clear();
      forwardRef.current = {};
      connectInFlightRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: SocketApi = useMemo(
    () => ({
      ensureConnected,
      send,
      onMessage,
      findMatch,
      cancelFind,
      isSearching,
      lastError,
    }),
    [ensureConnected, send, onMessage, findMatch, cancelFind, isSearching, lastError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
