import { API_URL, MIN_PAYOUT } from "../../config";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useAuth } from "../../context/authContext";

/**
 * Modern Withdraw:
 * - Unified logic for Web & Mobile
 * - Responsive desktop view with max-width container
 * - Optimized with memoized cards and stable callbacks
 */

// ---------------- Constants ----------------
const SUCCESS_URL_PATTERNS = [/success/i, /status=paid/i, /payment\/done/i];
const PRESETS = [10, 50, 100, 200, 500];
const MAX_PAYOUT = 25000;

type MethodKey = "TELEBIRR" | "CBE_BIRR" | "MPESA";

// ---------------- Toast System ----------------
type ToastItem = { id: number; text: string; kind?: "success" | "info" | "error" };

function useToastQueue() {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((text: string, kind: ToastItem["kind"] = "success") => {
    const id = ++idRef.current;
    setQueue((q) => [...q, { id, text, kind }]);
    return id;
  }, []);
  const remove = useCallback((id: number) => setQueue((q) => q.filter((x) => x.id !== id)), []);
  return { queue, push, remove };
}

const ToastBucket = memo(function ToastBucket({ queue, onDone }: { queue: ToastItem[]; onDone: (id: number) => void; }) {
  return (
    <View pointerEvents="box-none" style={styles.toastBucket}>
      {queue.map((t) => <OneToast key={t.id} item={t} onDone={onDone} />)}
    </View>
  );
});

const OneToast = memo(function OneToast({ item, onDone }: { item: ToastItem; onDone: (id: number) => void; }) {
  const a = useRef(new Animated.Value(0)).current;
  const cfg = useMemo(() => {
    if (item.kind === "error") return { icon: "alert-circle", color: "#fb7185", border: "rgba(251,113,133,0.35)" };
    if (item.kind === "info") return { icon: "information-circle", color: "#60a5fa", border: "rgba(96,165,250,0.35)" };
    return { icon: "checkmark-circle", color: "#34d399", border: "rgba(52,211,153,0.35)" };
  }, [item.kind]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.delay(1700),
      Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
    ]).start(() => onDone(item.id));
  }, [a, item.id, onDone]);

  return (
    <Animated.View style={[styles.toast, { borderColor: cfg.border as any, opacity: a, transform: [
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
      { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ]}]}>
      <Ionicons name={cfg.icon as any} size={16} color={cfg.color as any} />
      <Text style={styles.toastText}>{item.text}</Text>
    </Animated.View>
  );
});

// ---------------- Components ----------------
const Notice = memo(function Notice({ type, text, onClose }: { type: "error" | "info" | "warning"; text: string; onClose?: () => void; }) {
  const isErr = type === "error";
  return (
    <View style={[styles.notice, isErr ? styles.noticeErr : styles.noticeInfo]}>
      <Ionicons name={isErr ? "warning" : "information-circle"} size={16} color="#E5E7EB" />
      <Text style={styles.noticeText}>{text}</Text>
      {!!onClose && (
        <Pressable onPress={onClose} hitSlop={10} style={styles.noticeClose}>
          <Ionicons name="close" size={16} color="#E5E7EB" />
        </Pressable>
      )}
    </View>
  );
});

const MethodCard = memo(function MethodCard({ item, selected, onPress }: { item: any; selected: boolean; onPress: () => void; }) {
  const { language } = useAuth();
  const isEN = language === "en";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.methodOuter, pressed && { opacity: 0.92 }]}>
      <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.methodGradient}>
        <View style={styles.methodTopRow}>
          <View style={styles.methodIcon}>
            <Ionicons name={item.icon} size={18} color="#0B0B0F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>{item.label}</Text>
            <Text style={styles.methodSubtitle}>{item.subtitle}</Text>
          </View>
          <View style={[styles.methodCheck, selected && styles.methodCheckOn]}>
            {selected ? <Ionicons name="checkmark" size={16} color="#0B0B0F" /> : null}
          </View>
        </View>
        <View style={styles.methodImageWrap}>
          <Image source={{ uri: item.imageUrl }} style={styles.methodImage} resizeMode="contain" />
        </View>
        <View style={styles.methodHintRow}>
          <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.methodHint}>{isEN ? "Secure payout • Usually instant" : "ደህንነቱ የተጠበቀ ክፍያ • አብዛኛውን ጊዜ ፈጣን"}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

// ---------------- Screen ----------------
export default function WithdrawScreen() {
  const router = useRouter();
  const { token, refreshProfile, language, user } = useAuth();
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1024 && isWeb;

  const methods = useMemo(() => [
    {
      key: "TELEBIRR",
      label: isEN ? "Telebirr" : "ቴሌብር",
      subtitle: isEN ? "Instant mobile payout" : "ፈጣን ሞባይል ክፍያ",
      colors: ["#E91E63", "#FF5722"] as const,
      icon: "phone-portrait" as const,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Telebirr_Logo.png/320px-Telebirr_Logo.png",
    },
    {
      key: "CBE_BIRR",
      label: isEN ? "CBE Birr" : "ሲቢኢ ብር",
      subtitle: isEN ? "CBEBirr mobile wallet (phone number)" : "ሲቢኢ ብር ሞባይል ኪስ ቦረሳ",
      colors: ["#1565C0", "#42A5F5"] as const,
      icon: "business" as const,
      imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/b/b8/CBE_logo.png/120px-CBE_logo.png",
    },
    {
      key: "MPESA",
      label: isEN ? "M-Pesa" : "ኤም-ፔሳ",
      subtitle: isEN ? "Safaricom mobile payout" : "ሳፋሪኮም ሞባይል ክፍያ",
      colors: ["#00897B", "#26C6DA"] as const,
      icon: "cellular" as const,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/200px-M-PESA_LOGO-01.svg.png",
    },
  ], [isEN]);

  const toast = useToastQueue();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(methods[0].key);
  const [accountNumber, setAccountNumber] = useState("");
  const [showGameWarning, setShowGameWarning] = useState(false);
  const [notice, setNotice] = useState<{ type: "info" | "warning" | "error"; text: string } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const webRef = useRef<WebView>(null);

  const amountNumber = useMemo(() => Number(String(amount).replace(/[^\d.]/g, "")) || 0, [amount]);
  const withdrawableBalance = Math.max(0, Number((user as any)?.withdrawable_balance) || 0);

  const totalGames = (user as any)?.total_games ?? 0;
  const hasPlayedMatch = totalGames > 0;
  const isInvalidAmount = amountNumber > 0 && (amountNumber < MIN_PAYOUT || amountNumber > MAX_PAYOUT);
  const methodMeta = useMemo(() => methods.find((m) => m.key === method) ?? methods[0], [method, methods]);

  // Validation Effect
  useEffect(() => {
    if (!hasPlayedMatch && user) {
      setNotice({ type: "info", text: isEN ? "You need to play at least one game to enable withdraw" : "ገንዘብ ለማውጣት ቢያንስ አንድ ጨዋታ መጫወት አለብዎት።" });
    } else if (amountNumber > 0 && amountNumber < MIN_PAYOUT) {
      setNotice({ type: "error", text: isEN ? `Minimum withdrawal is ${MIN_PAYOUT} ETB.` : `ዝቅተኛው የማውጫ መጠን ${MIN_PAYOUT} ብር ነው።` });
    } else if (amountNumber > MAX_PAYOUT) {
      setNotice({ type: "error", text: isEN ? "Maximum withdrawal exceeded." : "ከፍተኛው የማውጫ ገደብ አልፏል።" });
    } else if (amountNumber > withdrawableBalance && amountNumber > 10) {
      setNotice({ type: "error", text: isEN ? "Insufficient withdrawable balance." : "በቂ ቀሪ ሂሳብ የለም።" });
    } else {
      setNotice(null);
    }
  }, [hasPlayedMatch, isEN, user, amountNumber, withdrawableBalance]);

  const validate = useCallback(() => {
    if (!hasPlayedMatch) {
      setShowGameWarning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    if (!amountNumber || amountNumber < MIN_PAYOUT) {
      toast.push(isEN ? `Minimum withdrawal is ${MIN_PAYOUT} ETB.` : `ዝቅተኛው የማውጫ መጠን ${MIN_PAYOUT} ብር ነው።`, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    if (amountNumber > withdrawableBalance) {
      toast.push(isEN ? 'Insufficient withdrawable balance.' : 'በቂ ቀሪ ሂሳብ የለም።', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    if (!accountNumber || accountNumber.length < 7) {
      toast.push(isEN ? 'Please enter a valid account number.' : 'ትክክለኛ የሂሳብ ቁጥር ያስገቡ።', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    return true;
  }, [amountNumber, hasPlayedMatch, withdrawableBalance, accountNumber, isEN, toast]);

  const startWithdraw = useCallback(async () => {
    if (!validate()) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/payments/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-platform": isWeb ? "web" : "mobile",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: amountNumber,
          payoutMethod: method.toLowerCase(),
          payoutDestination: accountNumber,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Unable to withdraw");

      if (data?.checkout_url) {
        const checkoutUrl = String(data.checkout_url);
        const url = `${API_URL}/payments/chapa-bounce?url=${encodeURIComponent(checkoutUrl)}`;
        
        if (isWeb) {
          if (isDesktop) {
            window.open(url, '_blank');
          } else {
            window.location.href = url;
          }
        } else {
          setCheckoutUrl(String(data.checkout_url));
        }
        toast.push("Redirecting to withdrawal checkout…", "info");
        return;
      }

      await refreshProfile?.();
      toast.push("Withdraw requested successfully", "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => router.replace("/(authed)/home/gameplay"), 1000);
    } catch (err: any) {
      const msg = err?.message || "";
      setNotice({ type: "error", text: msg || "Could not start withdraw." });
      toast.push("Withdraw failed", "error");
    } finally {
      setBusy(false);
    }
  }, [amountNumber, method, accountNumber, refreshProfile, router, toast, token, validate, isWeb, isDesktop]);

  const onWebNav = useCallback(async (navState: WebViewNavigation) => {
    const isSuccess = SUCCESS_URL_PATTERNS.some((re) => re.test(navState.url));
    if (isSuccess) {
      setCheckoutUrl(null);
      await refreshProfile?.();
      toast.push("Payment completed", "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(authed)/home/gameplay');
    }
  }, [refreshProfile, router, toast]);

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? ["bottom"] : ["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={isWeb}>
          <View style={[styles.container, isDesktop && styles.desktopContainer]}>
            <LinearGradient colors={["#060614", "#0c0c1f"]} style={StyleSheet.absoluteFill} />
            
            {isDesktop && (
              <>
                <View style={[styles.glowBg, { top: -200, right: -200, backgroundColor: 'rgba(0,218,243,0.05)' }]} />
                <View style={[styles.glowBg, { bottom: -200, left: -200, backgroundColor: 'rgba(0,218,243,0.03)' }]} />
              </>
            )}

            <ScrollView contentContainerStyle={[styles.bg, isDesktop && { padding: 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {!isDesktop && (
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => router.replace('/(authed)/home/gameplay')} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={22} color="#E5E7EB" />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{isEN ? "Withdraw" : "ማውጫ"}</Text>
                    <Text style={styles.headerSub}>{isEN ? "Send money to your wallet" : "ገንዘብ ወደ አካውንትዎ ያስተላልፉ"}</Text>
                  </View>
                </View>
              )}

              {isDesktop && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={[styles.headerTitle, { fontSize: 24 }]}>{isEN ? "Withdraw Funds" : "ገንዘብ ያውጡ"}</Text>
                  <Text style={styles.headerSub}>{isEN ? "Transfer your winnings securely" : "ሽልማቶችዎን በደህንነት ያስተላልፉ"}</Text>
                </View>
              )}

              <LinearGradient colors={["rgba(166,139,255,0.15)", "rgba(0,218,243,0.05)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroKicker}>{isEN ? "Withdrawable Balance" : "ሊወጣ የሚችል ቀሪ ሂሳብ"}</Text>
                  <Text style={styles.heroText}>ETB {Number(withdrawableBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="flash" size={16} color="#0B0B0F" />
                  <Text style={styles.heroBadgeText}>{isEN ? "Instant" : "ወዲያውኑ"}</Text>
                </View>
              </LinearGradient>
              
              <Text style={styles.balanceNote}>
                {isEN ? "Note: All winnings and system bonuses are fully withdrawable." : "ማሳሰቢያ፡ ሁሉም አሸናፊዎች እና የሲስተም ቦነሶች ሙሉ በሙሉ ሊወጡ ይችላሉ።"}
              </Text>

              {notice && <Notice type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}

              <View style={styles.block}>
                <Text style={styles.blockTitle}>{isEN ? "Withdraw Amount" : "የማውጫ መጠን"}</Text>
                <View style={[styles.amountCard, isInvalidAmount && styles.amountCardError]}>
                  <View style={[styles.amountTopRow, isInvalidAmount && { borderBottomColor: "rgba(248,113,113,0.3)" }]}>
                    <Text style={[styles.amountPrefix, isInvalidAmount && { color: "#f87171" }]}>ETB</Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(0,218,243,0.3)"
                      style={[styles.amountInput, isInvalidAmount && { color: "#f87171" }]}
                      selectionColor="#00daf3"
                    />
                  </View>
                  <View style={styles.presetRow}>
                    {PRESETS.map((p) => (
                      <Pressable key={p} onPress={() => setAmount(String(p))} style={styles.preset}>
                        <Text style={styles.presetText}>+{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {!isInvalidAmount && <Text style={styles.limitHint}>{isEN ? `LIMITS: ${MIN_PAYOUT} - ${MAX_PAYOUT.toLocaleString()} ETB` : `ገደቦች፡ ከ${MIN_PAYOUT} - ${MAX_PAYOUT.toLocaleString()} ብር`}</Text>}
              </View>

              <View style={styles.block}>
                <Text style={styles.blockTitle}>{isEN ? "Payout Provider" : "የክፍያ አቅራቢ"}</Text>
                <View style={styles.methodsGrid}>
                  {methods.map((m) => (
                    <View key={m.key} style={styles.methodGridItem}>
                      <MethodCard item={m} selected={method === m.key} onPress={() => setMethod(m.key)} />
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockTitle}>{isEN ? "Phone / Account Number" : "ሞባይል/አካውንት ቁጥር"}</Text>
                <View style={styles.amountCard}>
                  <TextInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="numeric"
                    placeholder="2519..."
                    placeholderTextColor="rgba(0,218,243,0.4)"
                    style={[styles.amountInput, { fontSize: 22 }]}
                    selectionColor="#00daf3"
                  />
                </View>
              </View>

              <View style={{ height: 160 }} />
            </ScrollView>

            <View style={[styles.footer, isDesktop && styles.desktopFooter]}>
              <TouchableOpacity
                onPress={startWithdraw}
                disabled={busy || isInvalidAmount}
                activeOpacity={0.92}
                style={[styles.ctaOuter, (busy || isInvalidAmount) && { opacity: 0.5 }]}
              >
                <LinearGradient colors={methodMeta.colors as any} style={styles.cta}>
                  {busy ? <ActivityIndicator color="#0B0B0F" /> : (
                    <>
                      <Ionicons name="arrow-forward" size={20} color="#0B0B0F" />
                      <Text style={styles.ctaText}>Withdraw {amountNumber > 0 ? `ETB ${amountNumber}` : ""}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.footerHint}>{isEN ? "Secure Payout System • Terms Apply" : "ደህንነቱ የተጠበቀ የክፍያ ስርዓት • ደንቦች ተፈጻሚ ይሆናሉ"}</Text>
            </View>

            {!isWeb && (
              <Modal visible={!!checkoutUrl} animationType="slide" transparent>
                <View style={styles.webWrap}>
                  <View style={styles.webHeader}>
                    <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.webBtn}>
                      <Ionicons name="close" size={20} color="#E5E7EB" />
                    </TouchableOpacity>
                    <Text style={styles.webTitle}>{isEN ? "Withdrawal Terminal" : "የማውጫ ተርሚናል"}</Text>
                    <View style={{ width: 44 }} />
                  </View>
                  {checkoutUrl && (
                    <WebView ref={webRef} source={{ uri: checkoutUrl }} onNavigationStateChange={onWebNav} startInLoadingState />
                  )}
                </View>
              </Modal>
            )}

            <ToastBucket queue={toast.queue} onDone={toast.remove} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {showGameWarning && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)' }]}>
          <View style={{ backgroundColor: '#0c0c1f', padding: 24, borderRadius: 24, width: '85%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(248,113,113,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="game-controller" size={32} color="#f87171" />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
              {isEN ? 'Play to Withdraw' : 'ለመውጣት ይጫወቱ'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              {isEN ? 'You need to play at least 1 game before you can withdraw your funds. Start playing and winning!' : 'ገንዘብ ለማውጣት ቢያንስ 1 ጨዋታ መጫወት አለብዎት። አሁኑኑ ተጫውተው ያሸንፉ!'}
            </Text>
            <TouchableOpacity onPress={() => setShowGameWarning(false)} style={{ backgroundColor: '#00daf3', width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ color: '#0B0B0F', fontWeight: '900', fontSize: 15 }}>{isEN ? 'Okay, I understand' : 'እሺ፣ ገብቶኛል'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0c0c1f" },
  container: { flex: 1, width: '100%' },
  desktopContainer: {
    maxWidth: 600,
    alignSelf: 'center',
    marginVertical: 32,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  bg: { paddingHorizontal: 16, paddingTop: 10, flexGrow: 1 },
  glowBg: { position: 'absolute', width: 600, height: 600, borderRadius: 300, opacity: 0.15 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,218,243,0.08)", borderWidth: 1, borderColor: "rgba(0,218,243,0.15)",
  },
  headerTitle: { color: "#e5e3ff", fontWeight: "900", fontSize: 20, letterSpacing: 0.5 },
  headerSub: { color: "rgba(168,167,212,0.6)", fontWeight: "700", fontSize: 13, marginTop: 4 },
  hero: { marginTop: 12, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(0,218,243,0.2)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLeft: { flex: 1 },
  heroKicker: { color: "rgba(168,167,212,0.8)", fontWeight: "800", fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  heroText: { color: "#fff", fontWeight: "900", fontSize: 18, marginTop: 4 },
  heroBadge: { backgroundColor: "#00daf3", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center" },
  heroBadgeText: { color: "#0B0B0F", fontWeight: "900", fontSize: 12 },
  balanceNote: { color: 'rgba(168,167,212,0.4)', fontSize: 11, fontWeight: '700', marginTop: 12, paddingHorizontal: 4, lineHeight: 16 },
  notice: { marginTop: 16, borderRadius: 16, padding: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  noticeErr: { backgroundColor: "rgba(253,111,133,0.1)", borderColor: "rgba(253,111,133,0.2)" },
  noticeInfo: { backgroundColor: "rgba(0,218,243,0.1)", borderColor: "rgba(0,218,243,0.2)" },
  noticeText: { color: "#e5e3ff", fontWeight: "700", fontSize: 13, flex: 1 },
  noticeClose: { padding: 4 },
  block: { marginTop: 28 },
  blockTitle: { color: "rgba(229,227,255,0.5)", fontWeight: "900", fontSize: 12, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 },
  amountCard: { borderRadius: 24, padding: 20, backgroundColor: "rgba(0,218,243,0.05)", borderWidth: 1, borderColor: "rgba(0,218,243,0.1)" },
  amountCardError: { borderColor: "#f87171", borderWidth: 2, backgroundColor: "rgba(248,113,113,0.03)" },
  amountTopRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,218,243,0.1)" },
  amountPrefix: { color: "rgba(168,167,212,0.5)", fontWeight: "900", fontSize: 18 },
  amountInput: { fontWeight: "900", fontSize: 32, padding: 0, flex: 1, color: '#fff' },
  presetRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  preset: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(0,218,243,0.1)", borderWidth: 1, borderColor: "rgba(0,218,243,0.2)" },
  presetText: { color: "#00daf3", fontWeight: "900", fontSize: 14 },
  limitHint: { color: 'rgba(168,167,212,0.4)', fontSize: 11, fontWeight: '700', marginTop: 10, paddingLeft: 4 },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodGridItem: { minWidth: 160, flexGrow: 1, flexBasis: '46%' },
  methodOuter: { borderRadius: 24, overflow: "hidden", flex: 1 },
  methodGradient: { borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", height: '100%' },
  methodTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  methodTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  methodSubtitle: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 11, marginTop: 2 },
  methodCheck: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  methodCheckOn: { backgroundColor: "#fff" },
  methodImageWrap: { marginTop: 14, height: 70, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  methodImage: { width: "80%", height: "80%" },
  methodHintRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  methodHint: { color: "rgba(255,255,255,0.9)", fontWeight: "800", fontSize: 11 },
  footer: { padding: 16, paddingBottom: 32 },
  desktopFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24,
    backgroundColor: 'rgba(6, 6, 20, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)'
  },
  ctaOuter: { borderRadius: 20, overflow: "hidden" },
  cta: { paddingVertical: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 12 },
  ctaText: { color: "#0B0B0F", fontWeight: "900", fontSize: 17 },
  footerHint: { marginTop: 12, color: "rgba(168,167,212,0.4)", fontWeight: "700", fontSize: 11, textAlign: "center", textTransform: 'uppercase', letterSpacing: 1 },
  toastBucket: { position: "absolute", top: 10, left: 20, right: 20, zIndex: 999 },
  toast: {
    backgroundColor: "rgba(12,12,31,0.95)", borderWidth: 1.5, borderRadius: 18, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  toastText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  webWrap: { flex: 1, backgroundColor: "#0c0c1f" },
  webHeader: {
    height: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(0,218,243,0.1)",
  },
  webBtn: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,218,243,0.08)",
  },
  webTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
