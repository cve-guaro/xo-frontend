// hooks/useLoginFlow.ts
// Custom hook: all login flow logic + state, separated from UI.
// Screens consume this hook and stay purely presentational.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/authContext';
import { useBackgroundMusic } from '../context/BackgroundMusicProvider';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config';

const MAX_ATTEMPTS = 5;

export function useLoginFlow() {
  const router = useRouter();
  const { ref, promo, token: urlToken, refresh: urlRefresh } =
    useLocalSearchParams<{ ref?: string; promo?: string; token?: string; refresh?: string }>();
  const {
    requestOtp,
    verifyOtp,
    requestingOtp,
    verifyingOtp,
    pendingNumber,
    user,
    token,
    t,
    language,
    loginWithTelegram,
    telegramLoading,
    loginWithToken,
  } = useAuth();
  const { unlockAudio } = useBackgroundMusic();
  const toast = useToast();

  // ── phone helpers ──
  const parseToNational = useCallback((n?: string) => {
    if (!n) return '';
    const d = n.replace(/\D/g, '');
    if (d.startsWith('251') && d.length >= 12) return d.slice(3);
    if (d.startsWith('0') && d.length >= 10) return d.slice(1);
    if (d.length === 9) return d;
    return d.slice(-9);
  }, []);

  // ── state ──
  const [step, setStep] = useState<'number' | 'otp'>(pendingNumber ? 'otp' : 'number');
  const [loginMode, setLoginMode] = useState<'choice' | 'sms'>(pendingNumber ? 'sms' : 'choice');
  const [resendTimer, setResendTimer] = useState(0);
  const [maintenanceData, setMaintenanceData] = useState<{ error: string; message: string } | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [attemptCooldown, setAttemptCooldown] = useState(0);
  const [passLoading, setPassLoading] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [guestLoading, setGuestLoading] = useState<number | null>(null);
  const [national, setNational] = useState<string>(parseToNational(pendingNumber ?? undefined));
  const [otpParts, setOtpParts] = useState(['', '', '', '']);

  const otpRef = useRef(['', '', '', '']);
  const inputsRef = useRef<(any | null)[]>([null, null, null, null]);

  // Temporarily enabled for live testing; restore (__DEV__ || process.env.EXPO_PUBLIC_ENABLE_TEST_LOGIN === 'true') before public launch.
  const isTestLoginAllowed = true;

  // ── derived ──
  const nationalDigits = useMemo(() => national.replace(/\D/g, ''), [national]);
  const fullPhone = useMemo(() => {
    if (!nationalDigits) return '';
    const digits = nationalDigits.startsWith('0') ? nationalDigits.slice(1) : nationalDigits;
    return `+251${digits.slice(-9)}`;
  }, [nationalDigits]);
  const canSend =
    nationalDigits.length === 9 &&
    (nationalDigits.startsWith('9') || nationalDigits.startsWith('7')) &&
    !requestingOtp;
  const canVerify = otpParts.join('').length === 4 && !verifyingOtp;

  // ── timers ──
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (attemptCooldown > 0) {
      const timer = setTimeout(() => setAttemptCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (attemptCooldown === 0 && otpAttempts >= MAX_ATTEMPTS) {
      setOtpAttempts(0);
    }
  }, [attemptCooldown, otpAttempts]);

  // ── auto-login from URL token ──
  useEffect(() => {
    if (urlToken && !token && loginWithToken) {
      void loginWithToken(urlToken, urlRefresh);
    }
  }, [urlToken, urlRefresh, token, loginWithToken]);

  // ── redirect if already logged in ──
  useEffect(() => {
    if (token && user) {
      router.replace('/(authed)/home/gameplay');
    }
  }, [token, user, router]);

  // ── OTP handlers ──
  const setOtpAt = useCallback((index: number, digit: string) => {
    otpRef.current[index] = digit;
    setOtpParts((prev) => {
      if (prev[index] === digit) return prev;
      const next = [...prev];
      next[index] = digit;
      return next;
    });
  }, []);

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      const v = value.replace(/\D/g, '').slice(0, 1);
      setOtpAt(index, v);
      if (v && index < 3) {
        requestAnimationFrame(() => inputsRef.current[index + 1]?.focus());
      }
    },
    [setOtpAt]
  );

  const handleOtpKeyPress = useCallback((index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !otpRef.current[index] && index > 0) {
      requestAnimationFrame(() => inputsRef.current[index - 1]?.focus());
    }
  }, []);

  const clearOtp = useCallback(() => {
    otpRef.current = ['', '', '', ''];
    setOtpParts(['', '', '', '']);
    requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }, []);

  const formatPhone = useCallback((full: string) => {
    const d = full.replace(/\D/g, '');
    if (!d.startsWith('251')) return full;
    const nine = d.slice(-9);
    return `+251 ${nine.slice(0, 3)} ${nine.slice(3, 6)} ${nine.slice(6, 9)}`;
  }, []);

  // ── actions ──
  const onSend = useCallback(async () => {
    const isValidLength =
      nationalDigits.length === 9 &&
      (nationalDigits.startsWith('9') || nationalDigits.startsWith('7'));
    if (!isValidLength) {
      toast.warning('Invalid Number', 'Phone number must be exactly 9 digits and start with 9 or 7.');
      return;
    }
    if (otpAttempts >= MAX_ATTEMPTS && attemptCooldown > 0) {
      const mins = Math.ceil(attemptCooldown / 60);
      toast.warning(
        t('rate_limited_title'),
        language === 'en'
          ? `Too many attempts. Please wait ${attemptCooldown > 60 ? mins + ' minute' + (mins > 1 ? 's' : '') : attemptCooldown + ' seconds'} before trying again.`
          : `ብዙ ሙከራ ተደርጓል። እባክዎ ${attemptCooldown} ሰከንድ ይጠብቁ።`
      );
      return;
    }
    try {
      await unlockAudio();
      setOtpAttempts((prev) => prev + 1);
      await requestOtp(fullPhone);
      setStep('otp');
      requestAnimationFrame(() => inputsRef.current[0]?.focus());
    } catch (err: any) {
      if (err?.message === 'RATE_LIMITED') {
        if (otpAttempts + 1 >= MAX_ATTEMPTS) {
          setAttemptCooldown(120);
          toast.warning(
            t('rate_limited_title'),
            language === 'en'
              ? 'Too many attempts. Please wait 2 minutes before trying again.'
              : 'ብዙ ሙከራ ተደርጓል። እባክዎ 2 ደቂቃ ይጠብቁ።'
          );
        } else {
          toast.warning(
            'Please Wait',
            language === 'en'
              ? 'Please wait a moment before requesting another code.'
              : 'እባክዎ ሌላ ኮድ ከመጠየቅዎ በፊት ትንሽ ይጠብቁ።'
          );
        }
      } else {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error === 'System Maintenance') {
            setMaintenanceData({ error: parsed.error, message: parsed.message });
            return;
          }
        } catch {}
        toast.error('OTP Failed', err?.message || 'Could not send OTP.');
      }
    }
  }, [nationalDigits, requestOtp, fullPhone, unlockAudio, otpAttempts, attemptCooldown, language, t, toast]);

  const onVerify = useCallback(async () => {
    const code = otpRef.current.join('');
    if (!/^\d{4}$/.test(code)) {
      toast.warning('Invalid Code', 'Enter the 4-digit OTP code.');
      return;
    }
    try {
      await unlockAudio();
      await verifyOtp(fullPhone, code, ref, promo);
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error === 'System Maintenance') {
          setMaintenanceData({ error: parsed.error, message: parsed.message });
          return;
        }
      } catch {}
      toast.error('Verification Failed', err?.message || 'Please try again.');
      clearOtp();
    }
  }, [verifyOtp, fullPhone, clearOtp, unlockAudio, ref, promo, toast]);

  const resend = useCallback(async () => {
    if (resendTimer > 0) return;
    if (otpAttempts >= MAX_ATTEMPTS && attemptCooldown > 0) {
      const mins = Math.ceil(attemptCooldown / 60);
      toast.warning(
        t('rate_limited_title'),
        language === 'en'
          ? `Too many attempts. Please wait ${attemptCooldown > 60 ? mins + ' minute' + (mins > 1 ? 's' : '') : attemptCooldown + ' seconds'} before trying again.`
          : `ብዙ ሙከራ ተደርጓል። እባክዎ ${attemptCooldown} ሰከንድ ይጠብቁ።`
      );
      return;
    }
    try {
      setOtpAttempts((prev) => prev + 1);
      await requestOtp(fullPhone);
      clearOtp();
      setResendTimer(60);
    } catch (err: any) {
      if (err?.message === 'RATE_LIMITED') {
        if (otpAttempts + 1 >= MAX_ATTEMPTS) {
          setAttemptCooldown(120);
          toast.warning(
            t('rate_limited_title'),
            language === 'en'
              ? 'Too many attempts. Please wait 2 minutes before trying again.'
              : 'ብዙ ሙከራ ተደርጓል። እባክዎ 2 ደቂቃ ይጠብቁ።'
          );
        } else {
          toast.warning(
            'Please Wait',
            language === 'en'
              ? 'Please wait a moment before requesting another code.'
              : 'እባክዎ ሌላ ኮድ ከመጠየቅዎ በፊት ትንሽ ይጠብቁ።'
          );
        }
      } else {
        toast.error('Resend Failed', err?.message || 'Try again later.');
      }
    }
  }, [requestOtp, fullPhone, clearOtp, otpAttempts, attemptCooldown, language, t, toast, resendTimer]);

  const handleTelegramLogin = useCallback(async () => {
    try {
      await loginWithTelegram();
    } catch (err: any) {
      toast.error('Telegram Login', err?.message || 'Login failed');
    }
  }, [loginWithTelegram, toast]);

  const handleGuestLogin = useCallback(
    async (guestIndex: number) => {
      try {
        setGuestLoading(guestIndex);
        await unlockAudio();
        const res = await fetch(`${API_URL}/otp/guest-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestIndex }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || data?.message || 'Guest login failed');
        if (data.token && loginWithToken) {
          await loginWithToken(data.token, data.refreshToken);
          toast.success(
            'Guest access',
            `Signed in as ${data.user?.display_name || `Guest ${guestIndex}`} with 1,000 ETB`
          );
          setGuestModalVisible(false);
          router.replace('/(authed)/home/gameplay');
        }
      } catch (err: any) {
        toast.error('Guest sign in failed', err?.message || 'Could not sign in as guest. Please try again.');
      } finally {
        setGuestLoading(null);
      }
    },
    [unlockAudio, loginWithToken, toast, router]
  );

  // ── phone input change (shared by desktop + mobile) ──
  const onNationalChange = useCallback((text: string) => {
    let val = text.replace(/\D/g, '');
    if (val.length > 0 && val[0] !== '9' && val[0] !== '7') {
      val = val.replace(/^[^97]+/, '');
    }
    setNational(val.slice(0, 9));
  }, []);

  return {
    // state
    step,
    setStep,
    loginMode,
    setLoginMode,
    resendTimer,
    maintenanceData,
    setMaintenanceData,
    passLoading,
    guestModalVisible,
    setGuestModalVisible,
    guestLoading,
    national,
    otpParts,
    inputsRef,
    // derived
    nationalDigits,
    fullPhone,
    canSend,
    canVerify,
    isTestLoginAllowed,
    requestingOtp,
    verifyingOtp,
    telegramLoading,
    language,
    t,
    router,
    // handlers
    handleOtpChange,
    handleOtpKeyPress,
    clearOtp,
    onSend,
    onVerify,
    resend,
    handleTelegramLogin,
    handleGuestLogin,
    onNationalChange,
    formatPhone,
    parseToNational,
  };
}