import { API_URL, MIN_DEPOSIT } from "../../config";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
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
import { haptics } from "../../lib/haptcs";

/**
 * Modern Deposit:
 * - Unified logic for Web & Mobile
 * - Synchronized styling with Withdraw screen
 * - Handles dynamic payment methods from provider
 */

// ---------------- Constants ----------------
const SUCCESS_URL_PATTERNS = [/success/i, /status=paid/i, /payment\/done/i, /receipt/i, /chapa-return/i, /gameplay/i];
const PRESETS = [50, 100, 200, 500];
const MAX_DEPOSIT = 100000;

type PaymentMethod = {
  key: string;
  label: string;
  subtitle?: string;
  colors?: [string, string];
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  imageUrl?: string;
};

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
const Notice = memo(function Notice({ type, text, onClose }: { type: "error" | "info"; text: string; onClose?: () => void; }) {
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

const MethodCard = memo(function MethodCard({ item, selected, onPress }: { item: PaymentMethod; selected: boolean; onPress: () => void; }) {
  const { language } = useAuth();
  const isEN = language === "en";
  const colors = item.colors ?? ["#00daf3", "#22D3EE"];
  const icon = item.icon ?? "card-outline";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.methodOuter, pressed && { opacity: 0.92 }]}>
      <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.methodGradient}>
        <View style={styles.methodTopRow}>
          <View style={styles.methodIcon}>
            <Ionicons name={icon as any} size={18} color="#0B0B0F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>{item.label}</Text>
            <Text style={styles.methodSubtitle}>{item.subtitle || "Secure checkout"}</Text>
          </View>
          <View style={[styles.methodCheck, selected && styles.methodCheckOn]}>
            {selected ? <Ionicons name="checkmark" size={16} color="#0B0B0F" /> : null}
          </View>
        </View>
        <View style={styles.methodImageWrap}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.methodImage} resizeMode="contain" />
          ) : (
            <Ionicons name="shield-checkmark-outline" size={24} color="rgba(255,255,255,0.9)" />
          )}
        </View>
        <View style={styles.methodHintRow}>
          <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.methodHint}>{isEN ? "Secure checkout • instant deposit" : "ደህንነቱ የተጠበቀ ክፍያ • ፈጣን ተቀማጭ"}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

// ---------------- Screen ----------------
export default function DepositScreen() {
  const router = useRouter();
  const { token, refreshProfile, paymentMethod, language } = useAuth();
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = width >= 1024 && isWeb;

  const methods: PaymentMethod[] = useMemo(() => {
    const raw = (paymentMethod as any) || [];
    const normalized: PaymentMethod[] = Array.isArray(raw)
      ? raw.map((m: any) => ({
          key: String(m.key || m.provider || m.code || m.name || "UNKNOWN"),
          label: String(m.label || m.displayName || m.name || "Payment"),
          subtitle: m.subtitle ? String(m.subtitle) : "Secure checkout",
          colors: Array.isArray(m.colors) && m.colors.length >= 2 ? [m.colors[0], m.colors[1]] : undefined,
          icon: (m.icon as any) || "card-outline",
          imageUrl: m.imageUrl || m.logoUrl || m.image || undefined,
        }))
      : [];

    if (!normalized.length) {
      return [{
        key: "CHAPA",
        label: isEN ? "Chapa" : "ቻፓ",
        subtitle: isEN ? "Card & bank checkout" : "በካርድ እና በባንክ ማስገቢያ",
        colors: ["#00daf3", "#22D3EE"],
        icon: "card",
        imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0f2iB3_eSklK4Hc4DyH2IiG3vUM_bdm2sWA&s",
      }];
    }
    return normalized;
  }, [paymentMethod, isEN]);

  const toast = useToastQueue();
  const [amount, setAmount] = useState("200");
  const [method, setMethod] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!method && methods.length) setMethod(methods[0].key);
  }, [method, methods]);

  const amountNumber = useMemo(() => Number(String(amount).replace(/[^\d.]/g, "")) || 0, [amount]);
  const isInvalidAmount = amountNumber > 0 && (amountNumber < MIN_DEPOSIT || amountNumber > MAX_DEPOSIT);
  const methodMeta = useMemo(() => methods.find((m) => m.key === method) ?? methods[0], [method, methods]);

  useEffect(() => {
    if (amountNumber > 0 && amountNumber < MIN_DEPOSIT) {
      setNotice({ type: "error", text: isEN ? `Minimum deposit is ${MIN_DEPOSIT} ETB.` : `ዝቅተኛ ተቀማጭ ${MIN_DEPOSIT} ብር ነው።` });
    } else if (amountNumber > MAX_DEPOSIT) {
      setNotice({ type: "error", text: isEN ? `Maximum deposit is ${MAX_DEPOSIT.toLocaleString()} ETB.` : `ከፍተኛ ተቀማጭ ${MAX_DEPOSIT.toLocaleString()} ብር ነው።` });
    } else {
      setNotice(null);
    }
  }, [amountNumber, isEN]);

  const validate = useCallback(() => {
    if (!method) {
      setNotice({ type: "info", text: isEN ? "Choose a payment method to continue." : "ለመቀጠል የክፍያ አማራጭ ይምረጡ።" });
      toast.push(isEN ? "Choose a payment method to continue." : "ለመቀጠል የክፍያ አማራጭ ይምረጡ።", "info");
      return false;
    }
    if (!amountNumber || amountNumber < MIN_DEPOSIT) {
      const errMsg = isEN ? `Minimum deposit is ${MIN_DEPOSIT} ETB.` : `ዝቅተኛ ተቀማጭ ${MIN_DEPOSIT} ብር ነው።`;
      setNotice({ type: "error", text: errMsg });
      toast.push(errMsg, "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    return true;
  }, [amountNumber, method, isEN, toast]);

  const startDeposit = useCallback(async () => {
    haptics.heavy();
    if (!validate() || !methodMeta) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/payments/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-platform": isWeb ? "web" : "mobile",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: amountNumber, provider: methodMeta.key }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Unable to create checkout");

      if (data?.checkout_url) {
        // Use the new backend bounce endpoint to fix WebView / Telegram CSRF cookie issues
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
          if (data.txId) setCurrentTxId(String(data.txId));
        }
        toast.push("Redirecting to checkout…", "info");
        return;
      }

      if (data?.provider?.status === "success") {
        await refreshProfile?.();
        toast.push("Payment completed", "success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace("/(authed)/home/gameplay");
        return;
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Could not start deposit." });
      toast.push("Deposit failed", "error");
    } finally {
      setBusy(false);
    }
  }, [amountNumber, methodMeta, refreshProfile, router, toast, token, validate, isWeb, isDesktop]);

  const onWebNav = useCallback(async (navState: WebViewNavigation) => {
    const isSuccess = SUCCESS_URL_PATTERNS.some((re) => re.test(navState.url));
    if (!isSuccess) return;
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    if (currentTxId && token) {
      fetch(`${API_URL}/payments/verify/${currentTxId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }

    setTimeout(async () => {
      setCheckoutUrl(null);
      await refreshProfile?.();
      toast.push("Payment completed", "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(authed)/home/gameplay");
      redirectingRef.current = false;
    }, 5000);
  }, [refreshProfile, router, toast, currentTxId, token]);

  return (
    <SafeAreaView style={styles.safe} edges={isDesktop ? ["bottom"] : ["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={isWeb}>
          <View style={[styles.container, isDesktop && styles.desktopContainer]}>
            <LinearGradient colors={["#060614", "#0c0c1f"]} style={StyleSheet.absoluteFill} />
            
            {/* Ambient Glows for Desktop */}
            {isDesktop && (
              <>
                <View style={[styles.glowBg, { top: -200, right: -200, backgroundColor: 'rgba(0,218,243,0.05)' }]} />
                <View style={[styles.glowBg, { bottom: -200, left: -200, backgroundColor: 'rgba(0,218,243,0.03)' }]} />
              </>
            )}

            <ScrollView contentContainerStyle={[styles.bg, isDesktop && { padding: 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              {!isDesktop && (
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => router.replace("/(authed)/home/gameplay")} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={22} color="#E5E7EB" />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{isEN ? "Deposit" : "ገንዘብ ማስገቢያ"}</Text>
                    <Text style={styles.headerSub}>{isEN ? "Top up your balance instantly" : "ሂሳብዎን ወዲያውኑ ይሙሉ"}</Text>
                  </View>
                </View>
              )}

              {isDesktop && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={[styles.headerTitle, { fontSize: 24 }]}>{isEN ? "Deposit Funds" : "ገንዘብ ያክሉ"}</Text>
                  <Text style={styles.headerSub}>{isEN ? "Securely top up your account balance" : "በደህንነት የመለያ ሂሳብዎን ያስገቡ"}</Text>
                </View>
              )}

              {/* Hero */}
              <LinearGradient colors={["rgba(0,218,243,0.15)", "rgba(0,218,243,0.05)", "rgba(255,255,255,0.02)"]} style={styles.hero}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroKicker}>{isEN ? "Fast Checkout" : "ፈጣን ክፍያ"}</Text>
                  <Text style={styles.heroText}>{isEN ? `Deposit with ${methodMeta?.label || "provider"} • Instant` : `በ${methodMeta?.label || "አቅራቢ"} ያስገቡ • ፈጣን`}</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#0B0B0F" />
                  <Text style={styles.heroBadgeText}>{isEN ? "Verified" : "የተረጋገጠ"}</Text>
                </View>
              </LinearGradient>

              {notice && <Notice type={notice.type} text={notice.text} onClose={() => setNotice(null)} />}

              {/* Amount Input */}
              <View style={styles.block}>
                <Text style={styles.blockTitle}>{isEN ? "Amount" : "የገንዘብ መጠን"}</Text>
                <View style={[styles.amountCard, isInvalidAmount && styles.amountCardError]}>
                  <View style={[styles.amountTopRow, isInvalidAmount && { borderBottomColor: "rgba(248,113,113,0.3)" }]}>
                    <Text style={[styles.amountPrefix, isInvalidAmount && { color: "#f87171" }]}>ETB</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
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
                {!isInvalidAmount && <Text style={styles.limitHint}>{isEN ? `Minimum deposit: ${MIN_DEPOSIT} ETB` : `አነስተኛ መጠን: ${MIN_DEPOSIT} ብር`}</Text>}
              </View>

              {/* Method Selection */}
              <View style={styles.block}>
                <Text style={styles.blockTitle}>{isEN ? "Method" : "የክፍያ አማራጭ"}</Text>
                <View style={styles.methodsGrid}>
                  {methods.map((m) => (
                    <View key={m.key} style={styles.methodGridItem}>
                      <MethodCard item={m} selected={method === m.key} onPress={() => setMethod(m.key)} />
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ height: 160 }} />
            </ScrollView>

            {/* Sticky Actions */}
            <View style={[styles.footer, isDesktop && styles.desktopFooter]}>
              <TouchableOpacity
                onPress={startDeposit}
                disabled={busy || isInvalidAmount}
                activeOpacity={0.92}
                style={[styles.ctaOuter, (busy || isInvalidAmount) && { opacity: 0.5 }]}
              >
                <LinearGradient colors={(methodMeta?.colors as any) || ["#00daf3", "#00a3ff"]} style={styles.cta}>
                  {busy ? <ActivityIndicator color="#0B0B0F" /> : (
                    <>
                      <Ionicons name="flash" size={20} color="#0B0B0F" />
                      <Text style={styles.ctaText}>{isEN ? `Proceed to Payment ${amountNumber > 0 ? `• ETB ${amountNumber}` : ""}` : `ክፍያውን ይቀጥሉ ${amountNumber > 0 ? `• ${amountNumber} ብር` : ""}`}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.footerHint}>{isEN ? "Secure 128-bit SSL Encrypted Transaction" : "ደህንነቱ የተጠበቀ ባለ 128-ቢት SSL የተመሰጠረ ግብይት"}</Text>
            </View>

            {!isWeb && (
              <Modal visible={!!checkoutUrl} animationType="slide" transparent>
                <View style={styles.webWrap}>
                  <View style={styles.webHeader}>
                    <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.webBtn}>
                      <Ionicons name="close" size={20} color="#E5E7EB" />
                    </TouchableOpacity>
                    <Text style={styles.webTitle}>{isEN ? "Secure Payment Terminal" : "ደህንነቱ የተጠበቀ የክፍያ ተርሚናል"}</Text>
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
  methodsGrid: { gap: 12 },
  methodGridItem: { width: '100%' },
  methodOuter: { borderRadius: 24, overflow: "hidden" },
  methodGradient: { borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  methodTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  methodTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  methodSubtitle: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 11, marginTop: 2 },
  methodCheck: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  methodCheckOn: { backgroundColor: "#fff" },
  methodImageWrap: { marginTop: 14, height: 80, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  methodImage: { width: "85%", height: "85%" },
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
