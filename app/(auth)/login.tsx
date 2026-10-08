import { Ionicons } from "@expo/vector-icons";
import { ArrowForwardIcon, CheckmarkCircleIcon, ServerIcon, ConstructIcon, TelegramPlaneIcon, ChatBubbleIcon } from "../../components/SvgIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ImageBackground,
  Image,
} from "react-native";
import { useAuth } from "../../context/authContext";
import { useBackgroundMusic } from "../../context/BackgroundMusicProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { useToast } from "../../context/ToastContext";


export default function LoginScreen() {
  const router = useRouter();
  const { ref, promo, token: urlToken, refresh: urlRefresh } = useLocalSearchParams<{ref?: string, promo?: string, token?: string, refresh?: string}>();
  const { requestOtp, verifyOtp, requestingOtp, verifyingOtp, pendingNumber, user, token, t, language, loginWithTelegram, telegramLoading, loginWithToken } = useAuth();
  const { unlockAudio } = useBackgroundMusic();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';
  const mobileBannerHeight = Math.min(Math.max(Math.round(height * 0.58), 400), 560);
  const toast = useToast();

  // --- Helpers to convert pending number -> national part (last 9 digits) ---
  const parseToNational = (n?: string) => {
    if (!n) return "";
    const d = n.replace(/\D/g, "");
    // Strip country code if present (e.g. 2519xxxxxxxx -> 9xxxxxxxx)
    if (d.startsWith("251") && d.length >= 12) return d.slice(3);
    // Strip leading 0 from full local format (e.g. 09xxxxxxxx -> 9xxxxxxxx)
    if (d.startsWith("0") && d.length >= 10) return d.slice(1);
    if (d.length === 9) return d;
    return d.slice(-9);
  };

  const [step, setStep] = useState<"number" | "otp">(pendingNumber ? "otp" : "number");
  const [loginMode, setLoginMode] = useState<"choice" | "sms">(pendingNumber ? "sms" : "choice");
  const [resendTimer, setResendTimer] = useState(0);
  const [maintenanceData, setMaintenanceData] = useState<{ error: string, message: string } | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [attemptCooldown, setAttemptCooldown] = useState(0);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Attempt cooldown timer (2 min)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (attemptCooldown > 0) {
      timer = setTimeout(() => setAttemptCooldown((c) => c - 1), 1000);
    } else if (attemptCooldown === 0 && otpAttempts >= MAX_ATTEMPTS) {
      // Reset attempts after cooldown expires
      setOtpAttempts(0);
    }
    return () => clearTimeout(timer);
  }, [attemptCooldown, otpAttempts]);

  const [national, setNational] = useState<string>(parseToNational(pendingNumber ?? undefined));
  // Raw digits the user typed (may be 9 or 10 chars: optional leading 0)
  const nationalDigits = useMemo(() => national.replace(/\D/g, ""), [national]);

  const fullPhone = useMemo(() => {
    if (!nationalDigits) return "";
    // Strip leading 0 if user typed the full format (09xxxxxxxx)
    const digits = nationalDigits.startsWith("0") ? nationalDigits.slice(1) : nationalDigits;
    const nine = digits.slice(-9);
    return `+251${nine}`;
  }, [nationalDigits]);

  // OTP - 4 digits (keep as string; update is fast)
  const [otpParts, setOtpParts] = useState(["", "", "", ""]);
  const otpRef = useRef(["", "", "", ""]); // avoids laggy re-renders during typing
  // Safe mutable ref array — null initially, populated via ref={\ callback}
  const inputsRef = useRef<(TextInput | null)[]>([null, null, null, null]);

  // Auto-login if token is present in URL (e.g. from Telegram login return)
  useEffect(() => {
    if (urlToken && !token && loginWithToken) {
      void loginWithToken(urlToken, urlRefresh);
    }
  }, [urlToken, urlRefresh, token, loginWithToken]);

  // ---- route if already logged in
  useEffect(() => {
    if (token && user) {
      if (user.role === 'admin') {
        router.replace("/(authed)/admin");
      } else {
        router.replace("/(authed)/home/gameplay");
      }
    }
  }, [token, user, router]);


  // === OTP handlers (fast) ==========================================
  const setOtpAt = useCallback((index: number, digit: string) => {
    otpRef.current[index] = digit;
    // only update state once per change (still needed for render)
    setOtpParts((prev) => {
      if (prev[index] === digit) return prev;
      const next = [...prev];
      next[index] = digit;
      return next;
    });
  }, []);

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      const v = value.replace(/\D/g, "").slice(0, 1);
      setOtpAt(index, v);

      // focus next after state is applied (avoid jank)
      if (v && index < 3) {
        requestAnimationFrame(() => inputsRef.current[index + 1]?.focus());
      }
    },
    [setOtpAt]
  );

  const handleOtpKeyPress = useCallback((index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace" && !otpRef.current[index] && index > 0) {
      requestAnimationFrame(() => inputsRef.current[index - 1]?.focus());
    }
  }, []);

  const clearOtp = useCallback(() => {
    otpRef.current = ["", "", "", ""];
    setOtpParts(["", "", "", ""]);
    requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }, []);

  // === actions =======================================================
  const onSend = useCallback(async () => {
    // Enforce length of 9 and starting with 9 (Ethio Telecom) or 7 (Safaricom)
    const isValidLength = nationalDigits.length === 9 && (nationalDigits.startsWith('9') || nationalDigits.startsWith('7'));
    if (!isValidLength) {
      toast.warning("Invalid Number", "Phone number must be exactly 9 digits and start with 9 or 7.");
      return;
    }
    // Client-side rate limiting: only block after MAX_ATTEMPTS attempts
    if (otpAttempts >= MAX_ATTEMPTS && attemptCooldown > 0) {
      const mins = Math.ceil(attemptCooldown / 60);
      toast.warning(t("rate_limited_title"), language === 'en' 
        ? `Too many attempts. Please wait ${attemptCooldown > 60 ? mins + ' minute' + (mins > 1 ? 's' : '') : attemptCooldown + ' seconds'} before trying again.`
        : `ብዙ ሙከራ ተደርጓል። እባክዎ ${attemptCooldown} ሰከንድ ይጠብቁ።`);
      return;
    }
    try {
      await unlockAudio();
      setOtpAttempts(prev => prev + 1);
      await requestOtp(fullPhone);
      setStep("otp");
      // make sure first input focuses smoothly after transition
      requestAnimationFrame(() => inputsRef.current[0]?.focus());
    } catch (err: any) {
      if (err?.message === "RATE_LIMITED") {
        // Only show the rate limit message if client has exceeded MAX_ATTEMPTS
        if (otpAttempts + 1 >= MAX_ATTEMPTS) {
          setAttemptCooldown(120); // 2 minute cooldown
          toast.warning(t("rate_limited_title"), language === 'en'
            ? 'Too many attempts. Please wait 2 minutes before trying again.'
            : 'ብዙ ሙከራ ተደርጓል። እባክዎ 2 ደቂቃ ይጠብቁ።');
        } else {
          toast.warning("Please Wait", language === 'en' 
            ? 'Please wait a moment before requesting another code.'
            : 'እባክዎ ሌላ ኮድ ከመጠየቅዎ በፊት ትንሽ ይጠብቁ።');
        }
      } else {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error === "System Maintenance") {
            setMaintenanceData({ error: parsed.error, message: parsed.message });
            return;
          }
        } catch (e) {}
        toast.error("OTP Failed", err?.message || "Could not send OTP.");
      }
    }
  }, [nationalDigits.length, requestOtp, fullPhone, unlockAudio, otpAttempts, attemptCooldown, language]);

  const onVerify = useCallback(async () => {
    const code = otpRef.current.join("");
    if (!/^\d{4}$/.test(code)) {
      toast.warning("Invalid Code", "Enter the 4-digit OTP code.");
      return;
    }
    try {
      await unlockAudio();
      await verifyOtp(fullPhone, code, ref, promo);
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error === "System Maintenance") {
          setMaintenanceData({ error: parsed.error, message: parsed.message });
          return;
        }
      } catch (e) {}
      toast.error("Verification Failed", err?.message || "Please try again.");
      // optional UX: clear OTP on fail
      clearOtp();
    }
  }, [verifyOtp, fullPhone, clearOtp, unlockAudio, ref, promo]);

  const resend = useCallback(async () => {
    if (resendTimer > 0) return;
    // Client-side rate limiting: block after MAX_ATTEMPTS attempts
    if (otpAttempts >= MAX_ATTEMPTS && attemptCooldown > 0) {
      const mins = Math.ceil(attemptCooldown / 60);
      toast.warning(t("rate_limited_title"), language === 'en'
        ? `Too many attempts. Please wait ${attemptCooldown > 60 ? mins + ' minute' + (mins > 1 ? 's' : '') : attemptCooldown + ' seconds'} before trying again.`
        : `ብዙ ሙከራ ተደርጓል። እባክዎ ${attemptCooldown} ሰከንድ ይጠብቁ።`);
      return;
    }
    try {
      setOtpAttempts(prev => prev + 1);
      await requestOtp(fullPhone);
      clearOtp();
      setResendTimer(60);
    } catch (err: any) {
      if (err?.message === "RATE_LIMITED") {
        if (otpAttempts + 1 >= MAX_ATTEMPTS) {
          setAttemptCooldown(120);
          toast.warning(t("rate_limited_title"), language === 'en'
            ? 'Too many attempts. Please wait 2 minutes before trying again.'
            : 'ብዙ ሙከራ ተደርጓል። እባክዎ 2 ደቂቃ ይጠብቁ።');
        } else {
          toast.warning("Please Wait", language === 'en'
            ? 'Please wait a moment before requesting another code.'
            : 'እባክዎ ሌላ ኮድ ከመጠየቅዎ በፊት ትንሽ ይጠብቁ።');
        }
      } else {
        toast.error("Resend Failed", err?.message || "Try again later.");
      }
    }
  }, [requestOtp, fullPhone, clearOtp, otpAttempts, attemptCooldown, language]);

  // Valid if exactly 9 digits and starting with 9 (Ethio Telecom) or 7 (Safaricom)
  const canSend = nationalDigits.length === 9 && (nationalDigits.startsWith('9') || nationalDigits.startsWith('7')) && !requestingOtp;
  const canVerify = otpParts.join("").length === 4 && !verifyingOtp;

  const BANNER_IMAGE = require("../../assets/images/login-banner.jpg");

  return (
    <View style={styles.backgroundImage}>
      {Platform.OS === 'web' && (
        <Head>
          <title>XO Ethiopia - Play Tic-Tac-Toe & Spin for Real Money</title>
          <meta name="title" content="XO Ethiopia - Play Tic-Tac-Toe & Spin for Real Money" />
          <meta name="description" content="Play Tic-Tac-Toe and Spin games for real cash on XO Ethiopia. Instant deposit and withdrawal." />
        </Head>
      )}
      <LinearGradient colors={["#04040a", "#090918", "#04040a"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView 
        style={styles.safe} 
        edges={isDesktop ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {isDesktop ? (
            /* Desktop Layout: Split 2-column layout */
            <View style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
              <View style={styles.desktopContainer}>
                {/* Left Column: Floating Rounded Banner Card */}
                <View style={styles.desktopBannerCard}>
                  <Image 
                    source={BANNER_IMAGE}
                    style={styles.bannerImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(4, 4, 10, 0.2)", "rgba(4, 4, 10, 0.9)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.desktopBannerFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image 
                        source={require("../../assets/images/adaptive-icon.png")} 
                        style={{ width: 30, height: 30, borderRadius: 8 }} 
                        // @ts-ignore
                        {...(Platform.OS === 'web' ? { fetchPriority: "high" } : {})}
                      />
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>XO ETHIOPIA</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
                      Play Tic-Tac-Toe & Win Real Cash
                    </Text>
                  </View>
                </View>

                {/* Right Column: Clean Form Container */}
                <View style={styles.desktopFormWrap}>
                  <Text style={styles.cardTitle}>
                    {language === 'am' ? 'እንኳን ደህና መጡ' : 'Welcome back'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {language === 'am' 
                      ? 'ለመጫወት እና ለማሸነፍ የመግቢያ መንገድ ይምረጡ'
                      : 'Fast and secure login to play & win real cash'}
                  </Text>

                  {step === "number" ? (
                    <View style={{ marginTop: 28 }}>
                      {loginMode === "choice" ? (
                        <View style={{ gap: 14 }}>
                          {/* Button 1: Coral-Red Pill Button for Telegram */}
                          <TouchableOpacity
                            disabled={telegramLoading}
                            onPress={async () => {
                              try {
                                await loginWithTelegram();
                              } catch (err: any) {
                                toast.error('Telegram Login', err?.message || 'Login failed');
                              }
                            }}
                            activeOpacity={0.85}
                          >
                            <LinearGradient
                              colors={["#FF3B5C", "#E02847"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.primaryActionBtn}
                            >
                              {telegramLoading ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <>
                                  <TelegramPlaneIcon size={20} color="#ffffff" />
                                  <Text style={styles.primaryActionBtnText}>
                                    {language === 'am' ? 'በቴሌግራም ቦት ግባ' : 'Continue with Telegram'}
                                  </Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>

                          {telegramLoading && (
                            <Text style={styles.loadingTipText}>
                              {language === 'am' 
                                ? 'ቴሌግራምን ይክፈቱ እና ስልክ ቁጥርዎን ያጋሩ...' 
                                : 'Open Telegram and tap Share Contact...'}
                            </Text>
                          )}

                          {/* Button 2: Dark Sleek Pill Button for Phone SMS */}
                          <TouchableOpacity
                            onPress={() => setLoginMode("sms")}
                            activeOpacity={0.8}
                            style={styles.secondaryActionBtn}
                          >
                            <ChatBubbleIcon size={19} color="#FF3B5C" />
                            <Text style={styles.secondaryActionBtnText}>
                              {language === 'am' ? 'በስልክ ቁጥር (SMS OTP) ግባ' : 'Continue with Phone (SMS OTP)'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* SMS Phone Input View */
                        <View>
                          <TouchableOpacity 
                            onPress={() => setLoginMode("choice")}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}
                          >
                            <Text style={{ color: '#FF3B5C', fontSize: 13, fontWeight: '700' }}>← Back to login options</Text>
                          </TouchableOpacity>

                          <View style={styles.phoneInputGrid}>
                            <View style={styles.countryPicker}>
                              <Text style={{ fontSize: 16 }}>🇪🇹</Text>
                              <Text style={styles.countryCode}>+251</Text>
                            </View>
                            <View style={styles.phoneInputWrap}>
                              <TextInput
                                placeholder="9xx / 7xx xxx xxx"
                                placeholderTextColor="rgba(255,255,255,0.25)"
                                style={styles.mainInput}
                                keyboardType="number-pad"
                                value={national}
                                onChangeText={(t) => {
                                  let val = t.replace(/\D/g, "");
                                  if (val.length > 0 && val[0] !== '9' && val[0] !== '7') {
                                     val = val.replace(/^[^97]+/, "");
                                  }
                                  setNational(val.slice(0, 9));
                                }}
                                maxLength={9}
                              />
                            </View>
                          </View>

                          <TouchableOpacity 
                            disabled={!canSend} 
                            onPress={onSend} 
                            activeOpacity={0.85}
                            style={{ marginTop: 20 }}
                          >
                            <LinearGradient 
                              colors={canSend ? ["#FF3B5C", "#E02847"] : ["rgba(255, 59, 92, 0.2)", "rgba(224, 40, 71, 0.2)"]} 
                              start={{x:0,y:0}} end={{x:1,y:0}}
                              style={styles.sendBtn}
                            >
                              {requestingOtp ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Text style={[styles.sendBtnText, { color: canSend ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                                    {language === 'am' ? 'የማረጋገጫ ኮድ ላክ' : 'Send Verification Code'}
                                  </Text>
                                  <ArrowForwardIcon size={18} color={canSend ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                                </View>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* OTP Verification View */
                    <View style={{ marginTop: 24 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                        {language === 'am' ? 'ወደ ስልክዎ የተላከውን 4-ዲጂት ኮድ ያስገቡ' : `Enter the 4-digit code sent to ${prettyFull(fullPhone)}`}
                      </Text>
                      <View style={styles.otpInputGridWrapper}>
                        <View style={styles.otpInputGrid}>
                          {[0, 1, 2, 3].map((i) => (
                            <TextInput
                              key={i}
                              ref={(r) => { inputsRef.current[i] = r; }}
                              keyboardType="number-pad"
                              value={otpParts[i]}
                              onChangeText={(t) => handleOtpChange(i, t)}
                              onKeyPress={(e) => handleOtpKeyPress(i, e)}
                              maxLength={1}
                              style={[styles.otpInput, otpParts[i] ? styles.otpInputActive : null]}
                            />
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity 
                        disabled={!canVerify} 
                        onPress={onVerify} 
                        activeOpacity={0.85}
                        style={{ marginTop: 22 }}
                      >
                        <LinearGradient 
                          colors={canVerify ? ["#FF3B5C", "#E02847"] : ["rgba(255, 59, 92, 0.2)", "rgba(224, 40, 71, 0.2)"]} 
                          start={{x:0,y:0}} end={{x:1,y:0}}
                          style={styles.sendBtn}
                        >
                          {verifyingOtp ? (
                            <ActivityIndicator color="#ffffff" />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.sendBtnText, { color: canVerify ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                                {t("verify_button")}
                              </Text>
                              <CheckmarkCircleIcon size={18} color={canVerify ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <TouchableOpacity onPress={() => setStep("number")}>
                          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' }}>Edit number</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={resend} disabled={requestingOtp || resendTimer > 0}>
                          <Text style={{ color: (requestingOtp || resendTimer > 0) ? '#64748b' : '#FF3B5C', fontSize: 13, fontWeight: '700' }}>
                            {requestingOtp ? 'Sending...' : (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Legal Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.footerInfo}>
                      By continuing, you agree to our{" "}
                      <Text style={styles.footerLink} onPress={() => router.push('/(auth)/terms')}>Terms of Service</Text> and{" "}
                      <Text style={styles.footerLink} onPress={() => router.push('/(auth)/privacy')}>Privacy Policy</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* Mobile Layout: Full screen edge-to-edge cover (Matching Wireframe media_1791484935888.png & Reference media_1791480596521.png) */
            <ScrollView 
              contentContainerStyle={styles.mobileScrollContent}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Top Banner Image with smooth bottom fade to pure dark */}
              <View style={[styles.mobileBannerWrap, { height: mobileBannerHeight }]}>
                <Image 
                  source={BANNER_IMAGE}
                  style={[
                    styles.bannerImg,
                    Platform.OS === 'web' ? ({ objectPosition: 'top center' } as any) : {}
                  ]}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(4, 4, 10, 0.15)", "rgba(4, 4, 10, 0.7)", "#04040a"]}
                  locations={[0, 0.42, 0.78, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Lower Body Section */}
              <View style={styles.mobileBody}>
                <View style={styles.mobileHeaderWrap}>
                  <Text style={styles.mobileTitle}>
                    {language === 'am' ? 'እንኳን ደህና መጡ' : 'Welcome back'}
                  </Text>
                  <Text style={styles.mobileSub}>
                    {language === 'am' 
                      ? 'ለመጫወት እና ለማሸነፍ የመግቢያ መንገድ ይምረጡ'
                      : 'Fast and secure login to play & win real cash'}
                  </Text>
                </View>

                {/* Bottom container pushing actions and footer to the bottom matching wireframe */}
                <View style={styles.mobileBottomSection}>
                  {step === "number" ? (
                    <View style={styles.mobileActionsWrap}>
                      {loginMode === "choice" ? (
                        <View style={{ gap: 14 }}>
                          {/* Button 1: Coral-Red Pill Button for Telegram */}
                          <TouchableOpacity
                            disabled={telegramLoading}
                            onPress={async () => {
                              try {
                                await loginWithTelegram();
                              } catch (err: any) {
                                toast.error('Telegram Login', err?.message || 'Login failed');
                              }
                            }}
                            activeOpacity={0.85}
                            style={{ width: '100%' }}
                          >
                            <LinearGradient
                              colors={["#FF3B5C", "#E02847"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.primaryActionBtn}
                            >
                              {telegramLoading ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <>
                                  <TelegramPlaneIcon size={20} color="#ffffff" />
                                  <Text style={styles.primaryActionBtnText}>
                                    {language === 'am' ? 'በቴሌግራም ቦት ግባ' : 'Continue with Telegram'}
                                  </Text>
                                </>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>

                          {telegramLoading && (
                            <Text style={styles.loadingTipText}>
                              {language === 'am' 
                                ? 'ቴሌግራምን ይክፈቱ እና ስልክ ቁጥርዎን ያጋሩ...' 
                                : 'Open Telegram and tap Share Contact...'}
                            </Text>
                          )}

                          {/* Button 2: Dark Sleek Pill Button for Phone SMS */}
                          <TouchableOpacity
                            onPress={() => setLoginMode("sms")}
                            activeOpacity={0.8}
                            style={styles.secondaryActionBtn}
                          >
                            <ChatBubbleIcon size={19} color="#FF3B5C" />
                            <Text style={styles.secondaryActionBtnText}>
                              {language === 'am' ? 'በስልክ ቁጥር (SMS OTP) ግባ' : 'Continue with Phone (SMS OTP)'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* SMS Phone Input View */
                        <View>
                          <TouchableOpacity 
                            onPress={() => setLoginMode("choice")}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}
                          >
                            <Ionicons name="arrow-back" size={16} color="#FF3B5C" />
                            <Text style={{ color: '#FF3B5C', fontSize: 13, fontWeight: '700' }}>
                              {language === 'am' ? 'ወደ መግቢያ አማራጮች ተመለስ' : 'Back to login'}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.phoneInputGrid}>
                            <View style={styles.countryPicker}>
                              <Text style={{ fontSize: 16 }}>🇪🇹</Text>
                              <Text style={styles.countryCode}>+251</Text>
                            </View>
                            <View style={styles.phoneInputWrap}>
                              <TextInput
                                placeholder="9xx / 7xx xxx xxx"
                                placeholderTextColor="rgba(255,255,255,0.25)"
                                style={styles.mainInput}
                                keyboardType="number-pad"
                                value={national}
                                onChangeText={(t) => {
                                  let val = t.replace(/\D/g, "");
                                  if (val.length > 0 && val[0] !== '9' && val[0] !== '7') {
                                     val = val.replace(/^[^97]+/, "");
                                  }
                                  setNational(val.slice(0, 9));
                                }}
                                maxLength={9}
                              />
                            </View>
                          </View>

                          <TouchableOpacity 
                            disabled={!canSend} 
                            onPress={onSend} 
                            activeOpacity={0.85}
                            style={{ marginTop: 20 }}
                          >
                            <LinearGradient 
                              colors={canSend ? ["#FF3B5C", "#E02847"] : ["rgba(255, 59, 92, 0.2)", "rgba(224, 40, 71, 0.2)"]} 
                              start={{x:0,y:0}} end={{x:1,y:0}}
                              style={styles.sendBtn}
                            >
                              {requestingOtp ? (
                                <ActivityIndicator color="#ffffff" />
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Text style={[styles.sendBtnText, { color: canSend ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                                    {language === 'am' ? 'የማረጋገጫ ኮድ ላክ' : 'Send Verification Code'}
                                  </Text>
                                  <ArrowForwardIcon size={18} color={canSend ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                                </View>
                              )}
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    /* OTP Verification View */
                    <View style={styles.mobileActionsWrap}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                        {language === 'am' ? 'ወደ ስልክዎ የተላከውን 4-ዲጂት ኮድ ያስገቡ' : `Enter the 4-digit code sent to ${prettyFull(fullPhone)}`}
                      </Text>
                      <View style={styles.otpInputGridWrapper}>
                        <View style={styles.otpInputGrid}>
                          {[0, 1, 2, 3].map((i) => (
                            <TextInput
                              key={i}
                              ref={(r) => { inputsRef.current[i] = r; }}
                              keyboardType="number-pad"
                              value={otpParts[i]}
                              onChangeText={(t) => handleOtpChange(i, t)}
                              onKeyPress={(e) => handleOtpKeyPress(i, e)}
                              maxLength={1}
                              style={[styles.otpInput, otpParts[i] ? styles.otpInputActive : null]}
                            />
                          ))}
                        </View>
                      </View>

                      <TouchableOpacity 
                        disabled={!canVerify} 
                        onPress={onVerify} 
                        activeOpacity={0.85}
                        style={{ marginTop: 22 }}
                      >
                        <LinearGradient 
                          colors={canVerify ? ["#FF3B5C", "#E02847"] : ["rgba(255, 59, 92, 0.2)", "rgba(224, 40, 71, 0.2)"]} 
                          start={{x:0,y:0}} end={{x:1,y:0}}
                          style={styles.sendBtn}
                        >
                          {verifyingOtp ? (
                            <ActivityIndicator color="#ffffff" />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.sendBtnText, { color: canVerify ? '#ffffff' : 'rgba(255,255,255,0.4)' }]}>
                                {t("verify_button")}
                              </Text>
                              <CheckmarkCircleIcon size={18} color={canVerify ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <TouchableOpacity onPress={() => setStep("number")}>
                          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' }}>Edit number</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={resend} disabled={requestingOtp || resendTimer > 0}>
                          <Text style={{ color: (requestingOtp || resendTimer > 0) ? '#64748b' : '#FF3B5C', fontSize: 13, fontWeight: '700' }}>
                            {requestingOtp ? 'Sending...' : (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Legal Footer */}
                  <View style={styles.mobileFooterWrap}>
                    <Text style={styles.footerInfo}>
                      By continuing, you agree to our{" "}
                      <Text style={styles.footerLink} onPress={() => router.push('/(auth)/terms')}>Terms of Service</Text> and{" "}
                      <Text style={styles.footerLink} onPress={() => router.push('/(auth)/privacy')}>Privacy Policy</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Beautiful Maintenance Overlay */}
      {maintenanceData && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6, 6, 20, 0.9)' }]} />
          {Platform.OS === 'web' && (
            <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />
          )}
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: 'rgba(23, 23, 50, 0.7)',
              borderRadius: 32,
              padding: 32,
              paddingTop: 40,
              borderWidth: 1,
              borderColor: 'rgba(166,140,255,0.2)',
              shadowColor: '#00daf3',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 40,
              alignItems: 'center'
            }}>
              <View style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: 'rgba(0, 218, 243, 0.1)',
                borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)',
                justifyContent: 'center', alignItems: 'center',
                marginBottom: 32,
                shadowColor: '#00daf3', shadowOpacity: 0.5, shadowRadius: 20
              }}>
                <ServerIcon size={54} color="#00daf3" />
                <View style={{ position: 'absolute', bottom: -5, right: -5, width: 44, height: 44, borderRadius: 22, backgroundColor: '#0c0c1f', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0, 218, 243, 0.4)' }}>
                   <ConstructIcon size={20} color="#00daf3" />
                </View>
              </View>

              <Text style={{
                color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5,
                textShadowColor: 'rgba(0, 218, 243, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10
              }}>
                Maintenance
              </Text>
              
              <Text style={{
                color: 'rgba(229, 227, 255, 0.7)', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 10
              }}>
                We are currently working on providing you a better service. Please check back later.
              </Text>

              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setMaintenanceData(null)}
                style={{ width: '100%' }}
              >
                <LinearGradient 
                  colors={["#00daf3", "#008eb0"]} 
                  start={{x:0,y:0}} end={{x:1,y:0}}
                  style={{ height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#00daf3', shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 }}
                >
                  <Text style={{ color: '#0c0c1f', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

// Pretty print full number like +251 9xx xxx xxx
function prettyFull(full: string) {
  const d = full.replace(/\D/g, "");
  if (!d.startsWith("251")) return full;
  const nine = d.slice(-9);
  return `+251 ${nine.slice(0, 3)} ${nine.slice(3, 6)} ${nine.slice(6, 9)}`;
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%", backgroundColor: "#04040a" },
  safe: { flex: 1, backgroundColor: "transparent" },

  // Desktop Split 2-Column Layout (Matching Mockup Image 1)
  desktopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 920,
    width: '92%',
    alignSelf: 'center',
    gap: 48,
  },
  desktopBannerCard: {
    width: 380,
    height: 540,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0c0c16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
  },
  desktopBannerFooter: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  desktopFormWrap: {
    flex: 1,
    maxWidth: 420,
    justifyContent: 'center',
  },

  // Mobile Edge-to-Edge Screen Layout (Matching Wireframe media_1791484935888.png & Reference media_1791480596521.png)
  mobileScrollContent: {
    flexGrow: 1,
    minHeight: '100%',
    backgroundColor: '#04040a',
  },
  mobileBannerWrap: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#04040a',
    overflow: 'hidden',
  },
  mobileBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  mobileHeaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  mobileTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  mobileSub: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  mobileBottomSection: {
    width: '100%',
    marginTop: 18,
  },
  mobileActionsWrap: {
    width: '100%',
    marginBottom: 16,
  },
  mobileFooterWrap: {
    marginTop: 16,
    alignItems: 'center',
    paddingBottom: 8,
  },

  bannerImg: {
    width: '100%',
    height: '100%',
  },

  cardTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardSub: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  primaryActionBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    // Flat sleek pill button — no fuzzy drop shadow
    elevation: 0,
    ...(Platform.OS === 'web' ? ({ boxShadow: 'none' } as any) : {}),
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  secondaryActionBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#13131c',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    elevation: 0,
    ...(Platform.OS === 'web' ? ({ boxShadow: 'none' } as any) : {}),
  },
  secondaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  loadingTipText: {
    color: '#FF3B5C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },

  phoneInputGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#13131c',
    borderRadius: 27,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ outline: 'none' } as any) : {}),
  },
  countryCode: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  phoneInputWrap: {
    flex: 1,
    backgroundColor: '#13131c',
    borderRadius: 27,
    paddingHorizontal: 20,
    height: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ outline: 'none', boxShadow: 'none' } as any) : {}),
  },
  mainInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? ({
      outline: 'none',
      outlineStyle: 'none',
      outlineWidth: 0,
      boxShadow: 'none',
    } as any) : {}),
  },

  sendBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    ...(Platform.OS === 'web' ? ({ boxShadow: 'none' } as any) : {}),
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  otpInputGridWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  otpInputGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    maxWidth: 320,
    width: '100%',
  },
  otpInput: {
    flex: 1,
    height: 64,
    maxWidth: 60,
    backgroundColor: '#13131c',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    textAlign: 'center',
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    ...(Platform.OS === 'web' ? ({
      outline: 'none',
      outlineStyle: 'none',
      outlineWidth: 0,
      boxShadow: 'none',
    } as any) : {}),
  },
  otpInputActive: {
    borderColor: '#FF3B5C',
    backgroundColor: 'rgba(255, 59, 92, 0.08)',
    ...(Platform.OS === 'web' ? ({
      outline: 'none',
      boxShadow: 'none',
    } as any) : {}),
  },

  cardFooter: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerInfo: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FF3B5C',
    fontWeight: '700',
  },
});
