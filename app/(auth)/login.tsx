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
  const { ref, promo } = useLocalSearchParams<{ref?: string, promo?: string}>();
  const { requestOtp, verifyOtp, requestingOtp, verifyingOtp, pendingNumber, user, token, t, language, loginWithTelegram, telegramLoading } = useAuth();
  const { unlockAudio } = useBackgroundMusic();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';
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

  return (
    <View style={styles.backgroundImage}>
      {Platform.OS === 'web' && (
        <Head>
          <title>XO Ethiopia - Play Tic-Tac-Toe for Real Money</title>
          <meta name="title" content="XO Ethiopia - Play Tic-Tac-Toe for Real Money" />
          <meta name="description" content="Play Tic-Tac-Toe for real money on XO Ethiopia. Join tournaments, play with friends, and win cash prizes daily! Easy withdrawals via Telebirr." />
        </Head>
      )}
      <LinearGradient colors={["#060614", "#0c0c1f", "#060614"]} style={StyleSheet.absoluteFill} />
      {/* Subtle secondary glow overlay */}
      <LinearGradient 
        colors={["transparent", "rgba(0, 218, 243, 0.03)", "transparent"]} 
        start={{x:0, y:0}} end={{x:1, y:1}} 
        style={StyleSheet.absoluteFill} 
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "center" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[
            { flex: 1, maxWidth: 450, alignSelf: 'center', width: '92%', justifyContent: 'center' },
            isDesktop && styles.desktopWrapper
          ]}>
            
            {/* Card */}
            <View style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <View style={styles.logoCircle}>
                  <Image 
                    source={require("../../assets/images/adaptive-icon.png")} 
                    style={{ width: 28, height: 28, borderRadius: 6 }} 
                    // @ts-ignore
                    {...(Platform.OS === 'web' ? { fetchPriority: "high" } : {})}
                  />
                </View>
                <Text style={styles.cardBrand}>XO ET</Text>
              </View>

              <Text style={styles.cardTitle}>Sign in with your phone</Text>
              <Text style={styles.cardSub}>Welcome back. Enter your phone number to continue.</Text>

              {step === "number" ? (
                <View style={{ marginTop: 20 }}>
                  {loginMode === "choice" ? (
                    <View style={{ gap: 14 }}>
                      {/* Button 1: Telegram Bot Login */}
                      <TouchableOpacity
                        disabled={telegramLoading}
                        onPress={async () => {
                          try {
                            await loginWithTelegram();
                          } catch (err: any) {
                            toast.error('Telegram Login', err?.message || 'Login failed');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{
                          height: 58,
                          borderRadius: 18,
                          backgroundColor: 'rgba(0, 136, 204, 0.18)',
                          borderWidth: 1.5,
                          borderColor: 'rgba(0, 136, 204, 0.4)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 10,
                        }}>
                          {telegramLoading ? (
                            <ActivityIndicator color="#0088CC" />
                          ) : (
                            <>
                              <TelegramPlaneIcon size={20} color="#0088CC" />
                              <Text style={{ color: '#0088CC', fontSize: 15, fontWeight: '800' }}>
                                {language === 'am' ? 'በቴሌግራም ቦት ግባ (@XoethiopiaBot)' : 'Login with Telegram Bot'}
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>

                      {telegramLoading && (
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: -4 }}>
                          {language === 'am' 
                            ? 'ቴሌግራምን ይክፈቱ እና ስልክ ቁጥርዎን ያጋሩ...' 
                            : 'Open Telegram and share your phone number...'}
                        </Text>
                      )}

                      {/* Divider */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 12 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>OR</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                      </View>

                      {/* Button 2: SMS OTP Login */}
                      <TouchableOpacity
                        onPress={() => setLoginMode("sms")}
                        activeOpacity={0.8}
                      >
                        <View style={{
                          height: 58,
                          borderRadius: 18,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderWidth: 1.5,
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 10,
                        }}>
                          <ChatBubbleIcon size={20} color="#a78bfa" />
                          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>
                            {language === 'am' ? 'በስልክ ቁጥር (SMS OTP) ግባ' : 'Login with SMS OTP'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* SMS OTP Input View */
                    <View>
                      <TouchableOpacity 
                        onPress={() => setLoginMode("choice")}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
                      >
                        <Text style={{ color: '#00daf3', fontSize: 13, fontWeight: '700' }}>← Back to login options</Text>
                      </TouchableOpacity>

                      <View style={styles.phoneInputGrid}>
                        <View style={styles.countryPicker}>
                          <Text style={{ fontSize: 16 }}>🇪🇹</Text>
                          <Text style={styles.countryCode}>+251</Text>
                        </View>
                        <View style={styles.phoneInputWrap}>
                          <TextInput
                            placeholder="9xx / 7xx xxx xxx"
                            placeholderTextColor="rgba(255,255,255,0.2)"
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
                        activeOpacity={0.8}
                        style={{ marginTop: 20 }}
                      >
                        <LinearGradient 
                          colors={canSend ? ["#00daf3", "#00a3ff"] : ["rgba(0, 218, 243, 0.15)", "rgba(0, 163, 255, 0.15)"]} 
                          start={{x:0,y:0}} end={{x:1,y:0}}
                          style={styles.sendBtn}
                        >
                          {requestingOtp ? (
                            <ActivityIndicator color={canSend ? "#0c0c1f" : "rgba(255,255,255,0.4)"} />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.sendBtnText, { color: canSend ? '#0c0c1f' : 'rgba(255,255,255,0.4)' }]}>Send OTP</Text>
                              <ArrowForwardIcon size={18} color={canSend ? '#0c0c1f' : 'rgba(255,255,255,0.4)'} />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 24 }}>
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
                    activeOpacity={0.8}
                    style={{ marginTop: 20 }}
                  >
                    <LinearGradient 
                      colors={canVerify ? ["#00daf3", "#00a3ff"] : ["rgba(0, 218, 243, 0.15)", "rgba(0, 163, 255, 0.15)"]} 
                      start={{x:0,y:0}} end={{x:1,y:0}}
                      style={styles.sendBtn}
                    >
                      {verifyingOtp ? (
                        <ActivityIndicator color={canVerify ? "#0c0c1f" : "rgba(255,255,255,0.4)"} />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.sendBtnText, { color: canVerify ? '#0c0c1f' : 'rgba(255,255,255,0.4)' }]}>{t("verify_button")}</Text>
                          <CheckmarkCircleIcon size={18} color={canVerify ? '#0c0c1f' : 'rgba(255,255,255,0.4)'} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => setStep("number")}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Edit phone number</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={resend} disabled={requestingOtp || resendTimer > 0}>
                      <Text style={{ color: (requestingOtp || resendTimer > 0) ? '#64748b' : '#00daf3', fontSize: 13, fontWeight: '700' }}>
                        {requestingOtp ? 'Sending...' : (resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.footerInfo}>
                  By continuing, you agree to our{" "}
                  <Text style={styles.footerLink} onPress={() => router.push('/(auth)/terms')}>Terms of Service</Text> and{" "}
                  <Text style={styles.footerLink} onPress={() => router.push('/(auth)/privacy')}>Privacy Policy</Text>
                </Text>
              </View>
            </View>
          </View>
          
          {/* Global Status Footer */}
          <View style={styles.statusFooter}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SYSTEM STATUS: ONLINE</Text>
          </View>

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
              {/* Illustration Replacement using Neon Icons */}
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
  backgroundImage: { flex: 1, width: "100%", height: "100%", backgroundColor: "#020204" },
  safe: { flex: 1, backgroundColor: "transparent" },

  glassCard: {
    backgroundColor: 'rgba(23, 23, 37, 0.7)',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.3)',
  },
  cardBrand: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  cardTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  cardSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  phoneInputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countryCode: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  phoneInputWrap: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mainInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  sendBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  otpInputGridWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  otpInputGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 320,
    width: '100%',
  },
  otpInput: {
    flex: 1,
    height: 72,
    maxWidth: 64,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 10,
  },
  otpInputActive: {
    borderColor: 'rgba(0, 218, 243, 0.8)',
    backgroundColor: 'rgba(0, 218, 243, 0.08)',
    shadowOpacity: 0.3,
  },

  cardFooter: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerInfo: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#00daf3',
    fontWeight: '700',
  },

  statusFooter: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00daf3',
    shadowColor: '#00daf3',
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  desktopWrapper: {
    paddingVertical: 40,
  },
});
