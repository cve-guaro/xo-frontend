// app/game/waiting.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
// Removed expo-av import
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { haptics } from "../../../lib/haptcs";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../../config";

const { width: SCREEN_W } = Dimensions.get("window");

function parseErr(e: any): { code?: string; message: string; matchId?: string } {
  if (!e) return { message: "Unknown error" };
  if (typeof e === "string") return { message: e };
  const code = e.code || e?.payload?.code || e?.error?.code;
  const message = e.message || e?.payload?.message || e?.error?.message || "Something went wrong";
  const matchId = (e as any)?.matchId || (e as any)?.payload?.matchId || (e as any)?.error?.matchId;
  return { code, message, matchId };
}



export default function WaitingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { amount, time, token: urlToken, betMin, betMax } = useLocalSearchParams<{ amount?: string, time?: string, token?: string, betMin?: string, betMax?: string }>();
  const { user, token: ctxToken, refreshProfile, fixUrl } = useAuth();

  // Robust token: Prefer URL token for Join-by-Link scenarios, fallback to AuthContext
  const token = urlToken || ctxToken;

  const { ensureConnected, findMatch, cancelFind, onMessage, isSearching, lastError } = useSocket();
  const safeBetMin = useMemo(() => (betMin ? Number(betMin) : (amount ? Number(amount) : 50)), [betMin, amount]);
  const safeBetMax = useMemo(() => (betMax ? Number(betMax) : (amount ? Number(amount) : 50)), [betMax, amount]);

  const betRangeLabel = useMemo(() => {
    return safeBetMin === safeBetMax 
      ? `${safeBetMin}`
      : `${safeBetMin} - ${safeBetMax}`;
  }, [safeBetMin, safeBetMax]);

  const [elapsed, setElapsed] = useState(0);
  const [isMatched, setIsMatched] = useState(false);
  const [queued, setQueued] = useState(false);
  const [timeoutModal, setTimeoutModal] = useState(false);
  const navigatedRef = useRef(false);
  const issuedFindRef = useRef(false);
  const unsubRef = useRef<null | (() => void)>(null);

  const [internalError, setInternalError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (lastError) {
      setInternalError(lastError);
    }
  }, [lastError]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 2-minute client-side timeout → show "Try Another Room" modal
  useEffect(() => {
    if (elapsed >= 120 && !isMatched && !timeoutModal) {
      setTimeoutModal(true);
    }
  }, [elapsed, isMatched, timeoutModal]);

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const safeReplace = useCallback((p: any) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    try { refreshProfile?.(); } catch { }
    router.replace(p);
  }, [router, refreshProfile]);

  useFocusEffect(useCallback(() => {
    navigatedRef.current = false;
    issuedFindRef.current = false;
    return () => { unsubRef.current?.(); cancelFind?.().catch(() => { }); };
  }, [cancelFind]));

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    (async () => {
      try {
        try { await ensureConnected(token); } catch { }
        if (stopped) return;
        setQueued(true);
        if (!issuedFindRef.current) {
          issuedFindRef.current = true;
          findMatch(safeBetMin, safeBetMax).catch(() => { });
        }
        unsubRef.current = onMessage(async (msg) => {
          if (stopped || navigatedRef.current) return;
          if (msg?.type === "match_found") {
            setIsMatched(true);
            const { matchId, symbol, opponentUsername, opponentAvatar, houseCutPercent, timerDuration, betAmount: bkAmount, youAre } = msg.payload || {};

            // CRITICAL: Ensure matchId is a valid truthy string and not "undefined" or "null" literal
            const safeMatchId = String(matchId || "");
            if (!safeMatchId || safeMatchId === "undefined" || safeMatchId === "null") {
              console.error("[WAITING] Invalid matchId received:", matchId);
              return;
            }

            safeReplace({
              pathname: "/game/room",
              params: {
                id: safeMatchId,
                symbol: String(symbol || youAre || "X"),
                vs: opponentUsername || "Opponent",
                oppId: msg.payload?.opponentId || "",
                opponentAvatar: opponentAvatar || "",
                amount: String(bkAmount || safeBetMax),
                time: String(timerDuration || time || 30)
              }
            } as any);
          } else if (msg?.type === "queue_timeout") {
            setQueued(false); setTimeoutModal(true);
          }
        });
      } catch (err: any) {
        console.error("[WAITING] Catastrophic failure:", err);
        setInternalError(err.message || "Matchmaking initialization failed.");
      }
    })();
    return () => { stopped = true; unsubRef.current?.(); };
  }, [token, safeBetMin, safeBetMax, ensureConnected, findMatch, onMessage, safeReplace]);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] });
  const fade = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  if (internalError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060814', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Ionicons name="alert-circle" size={48} color="#fd6f85" />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 16 }}>Something went wrong</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 }}>{internalError}</Text>
        <TouchableOpacity
          onPress={() => router.replace('/home/gameplay')}
          style={{ marginTop: 24, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isDesktop) {
    return (
      <>
        <View style={{ flex: 1, backgroundColor: '#060814', overflow: 'hidden' }}>
          {Platform.OS !== 'web' && <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />}

          {/* Dynamic Premium Background */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={["rgba(129,236,255,0.03)", "transparent"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>

          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Header like mobile */}
            <View style={[st.mHeader, { width: 600, alignSelf: 'center', marginTop: 40 }]}>
              <View style={st.mHeaderCard}>
                <LinearGradient colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]} style={StyleSheet.absoluteFill} />
                <View style={st.mProfile}>
                  <View style={st.mAvatar}>
                    <LinearGradient colors={["#00daf3", "#00a3ff"]} style={[st.mAvatarInner]}>
                      <Ionicons name="person" size={18} color="#0c0c1f" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={st.mUsername}>{user?.username || "Player"}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>{isMatched ? 'MATCH FOUND' : 'WAITING...'}</Text>
                  </View>
                </View>
                <View style={st.mMeta}>
                  <View style={st.mBalance}><Text style={st.mBalanceText}>ETB {Number(user?.available_balance || 0).toLocaleString()}</Text></View>
                  <View style={st.mBet}><Text style={st.mBetText}>ETB {betRangeLabel} BET</Text></View>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={st.mOrbWrap}>
                <Animated.View style={[st.mOrbRing, { width: 220, height: 220, opacity: fade, transform: [{ scale }] }]} />
                <Animated.View style={[st.mOrbRing, { width: 170, height: 170, opacity: fade, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }] }]} />

                <View style={[st.mOrbCore, { width: 90, height: 90, borderRadius: 45 }]}>
                  <LinearGradient colors={isMatched ? ['#10b981', '#059669'] : ['#00daf3', '#00a3ff']} style={st.mOrbCoreInner}>
                    <Ionicons name={isMatched ? "checkmark" : "search"} size={40} color={isMatched ? "#fff" : "#0c0c1f"} />
                  </LinearGradient>
                </View>
              </View>

              <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 40 }}>
                {isMatched ? 'MATCH FOUND!' : 'FINDING OPPONENT...'}
              </Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 16 }}>
                <Text style={{ color: '#00daf3', fontSize: 16, fontWeight: '800' }}>{timeStr} elapsed</Text>
              </View>
            </View>

            <View style={{ paddingBottom: 60, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.replace('/home/gameplay' as any)} disabled={isMatched} style={{ width: 440, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }} activeOpacity={0.8}>
                <LinearGradient colors={["rgba(239,68,68,0.15)", "rgba(239,68,68,0.05)"]} style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Ionicons name="close-circle-outline" size={18} color="#f87171" />
                  <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>CANCEL SEARCH</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
        {/* 2-Min Timeout Modal - Desktop */}
        <Modal visible={timeoutModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#0e1420', borderRadius: 28, padding: 36, width: 400, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Ionicons name="time-outline" size={48} color="#f59e0b" />
                <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: '900', marginTop: 16, textAlign: 'center' }}>No Opponent Found</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>2 minutes elapsed with no match.</Text>
              </View>
              <View style={{ gap: 12 }}>
                <TouchableOpacity onPress={() => { setTimeoutModal(false); cancelFind?.().catch(() => { }); router.replace({ pathname: '/home/gameplay', params: { openRooms: 'true' } } as any); }} style={{ width: '100%', padding: 16, backgroundColor: 'rgba(0,218,243,0.15)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,218,243,0.4)', alignItems: 'center' }}>
                  <Text style={{ color: '#00daf3', fontSize: 16, fontWeight: '900' }}>Try Another Room</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTimeoutModal(false)} style={{ width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Keep Searching</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ─── PREMIUM MOBILE/TABLET DESIGN (Matching Desktop Fidelity) ───
  return (
    <View style={[st.root, { backgroundColor: '#0a0f1c' }]}>
      {Platform.OS !== 'web' && <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />}

      {/* Background Animated Blobs (Nebula Effect) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(0,218,243,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(0,218,243,0.04)' }} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={st.mHeader}>
          <View style={st.mHeaderCard}>
            <LinearGradient colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]} style={StyleSheet.absoluteFill} />
            <View style={st.mProfile}>
              <View style={st.mAvatar}>
                <LinearGradient colors={["#00daf3", "#00a3ff"]} style={[st.mAvatarInner]}>
                  <Ionicons name="person" size={18} color="#0c0c1f" />
                </LinearGradient>
              </View>
              <View>
                <Text style={st.mUsername}>{user?.username || "Player"}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>{isMatched ? 'MATCH FOUND' : 'WAITING...'}</Text>
              </View>
            </View>
            <View style={st.mMeta}>
              <View style={st.mBalance}><Text style={st.mBalanceText}>ETB {Number(user?.available_balance || 0).toLocaleString()}</Text></View>
              <View style={st.mBet}><Text style={st.mBetText}>ETB {betRangeLabel} BET</Text></View>
            </View>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={st.mOrbWrap}>
            {/* Radar Rings */}
            <Animated.View style={[st.mOrbRing, { width: 180, height: 180, opacity: fade, transform: [{ scale }] }]} />
            <Animated.View style={[st.mOrbRing, { width: 140, height: 140, opacity: fade, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }] }]} />

            <View style={st.mOrbCore}>
              <LinearGradient colors={isMatched ? ['#10b981', '#059669'] : ['#00daf3', '#00a3ff']} style={st.mOrbCoreInner}>
                <Ionicons name={isMatched ? "checkmark" : "search"} size={32} color={isMatched ? "#fff" : "#0c0c1f"} />
              </LinearGradient>
            </View>
          </View>

          <Text style={st.mTitle}>{isMatched ? "MATCH FOUND!" : (queued ? "Finding opponent..." : "Preparing...")}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 12 }}>
            <Text style={st.mSub}>{timeStr} elapsed</Text>
          </View>
        </View>

        <View style={st.mFooter}>

          <TouchableOpacity onPress={() => router.replace('/home/gameplay' as any)} disabled={isMatched} style={st.mCancel}>
            <LinearGradient colors={["rgba(239,68,68,0.2)", "rgba(239,68,68,0.1)"]} style={[st.mCancelInner, { borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }]}>
              <Text style={st.mCancelText}>CANCEL SEARCH</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 2-Min Timeout Modal - Mobile */}
      <Modal visible={timeoutModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0e1420', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 24 }} />
              <Ionicons name="time-outline" size={40} color="#f59e0b" />
              <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' }}>No Opponent Found</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8 }}>2 min elapsed.</Text>
            </View>
            <View style={{ gap: 12 }}>
              <TouchableOpacity onPress={() => { setTimeoutModal(false); cancelFind?.().catch(() => { }); router.replace({ pathname: '/home/gameplay', params: { openRooms: 'true' } } as any); }}
                style={{ width: '100%', padding: 16, backgroundColor: 'rgba(0,218,243,0.15)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,218,243,0.4)', alignItems: 'center' }}>
                <Text style={{ color: '#00daf3', fontSize: 16, fontWeight: '900' }}>Try Another Room</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTimeoutModal(false)}
                style={{ width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Keep Searching</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1c' },
  // Desktop
  dHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  dUser: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(129,236,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  dUsername: { color: '#ecedf6', fontSize: 13, fontWeight: '700', marginLeft: 10, marginRight: 10 },
  dBalance: { backgroundColor: 'rgba(0,218,243,0.05)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,218,243,0.2)' },
  dBalanceValue: { color: '#81ecff', fontSize: 13, fontWeight: '800' },
  dRadarArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dRadarContent: { position: 'absolute', alignItems: 'center' },
  dRadarCore: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  dStatusText: { color: '#ecedf6', fontSize: 18, fontWeight: '900', marginTop: 30, letterSpacing: 2 },
  dBento: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: 500, marginBottom: 40 },
  dStat: { flex: 1, alignItems: 'center' },
  dStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  dStatValue: { color: '#ecedf6', fontSize: 20, fontWeight: '900' },
  dFooter: { padding: 40, alignItems: 'center' },
  dCancel: { width: 400, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(253,111,133,0.3)' },
  dCancelInner: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dCancelText: { color: '#fd6f85', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  // Mobile
  mHeader: { padding: 14 },
  mHeaderCard: { borderRadius: 22, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(10,12,28,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  mAvatarInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mUsername: { color: '#fff', fontSize: 14, fontWeight: '900' },
  mMeta: { alignItems: 'flex-end', gap: 6 },
  mBalance: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 10 },
  mBalanceText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  mBet: { backgroundColor: 'rgba(255,215,0,0.1)', padding: 6, borderRadius: 10 },
  mBetText: { color: '#FFD700', fontSize: 11, fontWeight: '900' },
  mOrbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  mOrbRing: { position: 'absolute', borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(0,218,243,0.2)' },
  mOrbGlow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, backgroundColor: '#00daf3' },
  mOrbCore: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#00daf3', shadowOpacity: 0.5, shadowRadius: 10 },
  mOrbCoreInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24, letterSpacing: 1 },
  mSub: { color: '#00daf3', fontSize: 13, fontWeight: '800' },
  mFooter: { padding: 24, paddingBottom: 40 },
  mCancel: { borderRadius: 18, overflow: 'hidden' },
  mCancelInner: { paddingVertical: 16, alignItems: 'center' },
  mCancelText: { color: '#ef4444', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
