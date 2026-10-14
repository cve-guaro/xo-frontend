// app/game/waiting.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
  useWindowDimensions,
  ScrollView
} from "react-native";
import { useAuth } from "../../../context/authContext";
import { useSocket } from "../../../context/socketContext";
import { haptics } from "../../../lib/haptcs";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../../../config";
import { useBackgroundMusic } from "../../../context/BackgroundMusicProvider";
import NotificationsPopover from "../../../components/NotificationsPopover";
import PwaInstallModal from "../../../components/game/PwaInstallModal";
import { WebDepositModal, WebWithdrawModal } from "../../../components/WebModals";
import SearchingView from "../../../components/game/SearchingView";

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
  const { user, token: ctxToken, refreshProfile, fixUrl, language, switchLanguage } = useAuth();
  const { isPlaying, toggleMusic } = useBackgroundMusic();

  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pwaModalVisible, setPwaModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isEN = language === "en";

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

  const handleLanguageToggle = useCallback(() => {
    switchLanguage?.();
  }, [switchLanguage]);

  const handleNavClick = (screen: string) => {
    cancelFind?.().catch(() => {});
    if (screen === 'home') {
      router.push('/(authed)/home/gameplay');
    } else if (screen === 'history') {
      router.push('/(authed)/home/history');
    } else if (screen === 'leaderboard') {
      router.push('/(authed)/home/leaderboard');
    } else if (screen === 'transactions') {
      router.push('/(authed)/home/transactions');
    } else if (screen === 'profile') {
      router.push('/(authed)/home/account');
    } else if (screen === 'admin') {
      router.push('/(authed)/admin');
    }
  };

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
            setInternalError(null);
            const { matchId, symbol, opponentUsername, opponentAvatar, houseCutPercent, timerDuration, betAmount: bkAmount, youAre } = msg.payload || {};

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
          } else if (msg?.type === "error" && (msg?.payload?.message?.includes("INSUFFICIENT_BALANCE") || msg?.payload?.code === "INSUFFICIENT_BALANCE")) {
            setInternalError("Insufficient balance to join this room. Please top up your wallet.");
          }
        });
      } catch (err: any) {
        console.error("[WAITING] Catastrophic failure:", err);
        if (String(err?.message || "").includes("INSUFFICIENT_BALANCE")) {
          setInternalError("Insufficient balance to join this room. Please top up your wallet.");
        }
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
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 16 }}>Matchmaking Notice</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 }}>{internalError}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          {internalError.includes("balance") && (
            <TouchableOpacity
              onPress={() => setDepositVisible(true)}
              style={{ backgroundColor: '#06b6d4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Deposit Funds</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { cancelFind?.().catch(() => {}); router.replace('/home/gameplay'); }}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
        <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
      </View>
    );
  }

  if (isDesktop) {
    return (
      <View style={s.rootContainer}>
        {/* Web Deposit & Withdraw Modals & Notifications */}
        <WebDepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <WebWithdrawModal visible={withdrawVisible} onClose={() => setWithdrawVisible(false)} user={user} token={token || undefined} onSuccess={refreshProfile} />
        <NotificationsPopover visible={notificationsVisible} onClose={() => setNotificationsVisible(false)} onUnreadCountChange={setUnreadCount} />
        <PwaInstallModal visible={pwaModalVisible} onClose={() => setPwaModalVisible(false)} />

        {/* ── CORE BODY CONTAINER (Full-bleed desktop matchmaking arena) ── */}
        <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
          {/* ── HEADER BAR OVERLAY ── */}
          <View style={[s.header, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }]}>
            <View style={s.headerContentWrapper}>
              {/* Left: Logo */}
              <View style={s.logoContainer}>
                <Image source={require("../../../assets/images/icon.jpg")} style={s.logoImage} resizeMode="cover" />
                <Text style={s.logoText}>XO ETHIOPIA</Text>
              </View>

              {/* Right: Utility Cluster */}
              <View style={s.utilityCluster}>
                <TouchableOpacity onPress={() => setPwaModalVisible(true)} style={s.utilityBtn} activeOpacity={0.8}>
                  <Ionicons name="cloud-download-outline" size={16} color="#8b93a7" />
                  <Text style={s.utilityBtnText}>APP</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLanguageToggle} style={s.utilityBtn} activeOpacity={0.8}>
                  <Ionicons name="globe-outline" size={15} color="#8b93a7" />
                  <Text style={s.utilityBtnText}>{language?.toUpperCase() || "EN"}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleMusic} style={s.utilityBtn} activeOpacity={0.8}>
                  <Ionicons name={isPlaying ? "volume-medium-outline" : "volume-mute-outline"} size={16} color="#8b93a7" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={s.bellBtn} activeOpacity={0.8}>
                  <Ionicons name="notifications-outline" size={16} color="#8b93a7" />
                  {unreadCount > 0 && (
                    <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unreadCount}</Text></View>
                  )}
                </TouchableOpacity>

                {/* Profile Chip */}
                <TouchableOpacity onPress={() => handleNavClick('profile')} style={s.profileChip} activeOpacity={0.8}>
                  <View style={s.profileChipAvatar}>
                    <Text style={s.profileChipAvatarText}>{user?.username ? user.username.slice(0, 2).toUpperCase() : "ME"}</Text>
                  </View>
                  <View style={{ marginRight: 6 }}>
                    <Text style={s.profileChipName}>{user?.username || "Player"}</Text>
                    <Text style={s.profileChipVip}>VIP 24</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <SearchingView
            onCancel={() => { cancelFind?.().catch(() => {}); router.replace('/home/gameplay' as any); }}
            isMatched={isMatched}
            betMin={safeBetMin}
            betMax={safeBetMax}
          />
        </View>

        {/* 2-Min Timeout Modal */}
        <Modal visible={timeoutModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#0c0c16', borderRadius: 28, padding: 36, width: 420, maxWidth: '90%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <Ionicons name="time-outline" size={48} color="#f59e0b" />
                <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: '900', marginTop: 16, textAlign: 'center' }}>No Opponent Found</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>2 minutes elapsed with no match.</Text>
              </View>
              <View style={{ gap: 12 }}>
                <TouchableOpacity onPress={() => { setTimeoutModal(false); cancelFind?.().catch(() => { }); router.replace({ pathname: '/home/gameplay', params: { openRooms: 'true' } } as any); }} style={{ width: '100%', padding: 16, backgroundColor: 'rgba(34,211,238,0.12)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)', alignItems: 'center' }}>
                  <Text style={{ color: '#22d3ee', fontSize: 16, fontWeight: '900' }}>Try Another Room</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTimeoutModal(false)} style={{ width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontWeight: '700' }}>Keep Searching</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── MOBILE / TABLET VIEW ───
  return (
    <View style={[st.root, { backgroundColor: '#050814' }]}>
      {Platform.OS !== 'web' && <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <SearchingView
          onCancel={() => { cancelFind?.().catch(() => {}); router.replace('/home/gameplay' as any); }}
          isMatched={isMatched}
          betMin={safeBetMin}
          betMax={safeBetMax}
        />
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

const s = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: "#050814" },
  header: {
    height: 88,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  headerContentWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImage: { width: 36, height: 36, borderRadius: 18 },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  utilityCluster: { flexDirection: "row", alignItems: "center", gap: 16 },
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  utilityBtnText: { color: "#8b93a7", fontSize: 11, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.25)",
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
  },
  profileChipAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#8b5cf6", alignItems: "center", justifyContent: "center" },
  profileChipAvatarText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  profileChipName: { color: "#fff", fontSize: 12, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  profileChipVip: { color: "#a855f7", fontSize: 9, fontWeight: "900", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  mainScrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pageContentWrapper: { width: "100%", paddingHorizontal: 40, paddingVertical: 24, alignSelf: "center", maxWidth: 1440 },
  threeColumnRow: { flexDirection: "row", gap: 24, width: "100%" },
  leftSidebar: { width: 280, gap: 16 },
  card: { backgroundColor: "rgba(15, 23, 42, 0.3)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderRadius: 24, padding: 20 },
  userCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  userCardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#8b5cf6", alignItems: "center", justifyContent: "center" },
  userCardAvatarText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  userCardName: { color: "#fff", fontSize: 15, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  onlineText: { color: "#22c55e", fontSize: 11, fontWeight: "700" },
  tokensRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(10, 15, 30, 0.4)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.04)", padding: 12 },
  tokenLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "800", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" },
  tokenVal: { fontSize: 15, fontWeight: "900", marginTop: 2, fontFamily: "Inter, sans-serif" },
  tokenPlusBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  navText: { color: "#8b93a7", fontSize: 13, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  sectionTitleSmall: { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "Inter, sans-serif" },
  walletRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  walletLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter, sans-serif" },
  walletValSmall: { fontSize: 12, fontWeight: "800", fontFamily: "Inter, sans-serif" },
  walletValSecond: { color: "#8b93a7", fontSize: 12, fontWeight: "700", fontFamily: "Inter, sans-serif" },
  divider: { height: 1, backgroundColor: "rgba(255, 255, 255, 0.05)", marginVertical: 12 },

  root: { flex: 1, backgroundColor: '#050814' },
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
  mOrbCore: { width: 130, height: 130, borderRadius: 65, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#00daf3', shadowOpacity: 0.5, shadowRadius: 15 },
  mOrbCoreInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24, letterSpacing: 1 },
  mSub: { color: '#00daf3', fontSize: 13, fontWeight: '800' },
  mFooter: { padding: 24, paddingBottom: 40 },
  mCancel: { borderRadius: 18, overflow: 'hidden' },
  mCancelInner: { paddingVertical: 16, alignItems: 'center' },
  mCancelText: { color: '#ef4444', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});

const st = s;
