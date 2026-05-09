import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, Pressable, ActivityIndicator, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL, MIN_PAYOUT } from '../config';
import { useToast } from '../context/ToastContext';
import { haptics } from '../lib/haptcs';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  user?: any;
  token?: string;
  onSuccess?: () => void; // callback to refresh balance
  language?: string;
}


// ─── Shared animation helper ─────────────────────────────────────
function useModalAnim(visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(scale, { toValue: 1, speed: 16, bounciness: 6, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scale, { toValue: 0.95, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [visible]);

  return { opacity, scale };
}

// ════════════════════════════════════════════════════════════════
// DEPOSIT MODAL
// Calls: POST /payments/deposit → { checkout_url } → open in browser
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
export const WebDepositModal = ({ visible, onClose, user, token, onSuccess, language }: ModalProps) => {
  const isEN = language === 'en';
  const [amount, setAmount]   = useState('');
  const [amtError, setAmtError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const [loading, setLoading] = useState(false);
  const { opacity, scale }    = useModalAnim(visible);
  const toast = useToast();

  if (!visible) return null;
  const presets = [100, 200, 500, 1000];

  const validateAmount = (val: string) => {
    const n = Number(val);
    if (val && (!n || n < 10)) {
      setAmtError(isEN ? 'Minimum deposit is ETB 10' : 'ቢያንስ 10 ብር ያስገቡ');
    } else if (val && n > 100000) {
      setAmtError(isEN ? 'Maximum deposit is ETB 100,000' : 'ከ 100,000 ብር በላይ ማስገባት አይቻልም');
    } else {
      setAmtError('');
    }
  };

  const handleDeposit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10 || amt > 100000) {
      toast.warning(isEN ? 'Invalid Amount' : 'የተሳሳተ መጠን', isEN ? 'Valid range is ETB 10 - 100,000' : 'በ 10 እና 100,000 መሃል ያስገቡ።');
      return;
    }
    if (!token) { toast.error(isEN ? 'Not Logged In' : 'አልገቡም', isEN ? 'Please log in first.' : 'እባክዎ መጀመሪያ ይግቡ።'); return; }


    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/deposit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,          // ETB, backend converts to string
          provider: 'CHAPA',
          clientRef: `deposit_${user?.id}_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(isEN ? 'Deposit Failed' : 'ማስገባት አልተቻለም', data.detail || (isEN ? 'Could not initiate deposit.' : 'ሂደቱን መጀመር አልተቻለም።'));
        return;
      }


      // Use the new backend bounce endpoint to fix WebView / Telegram CSRF cookie issues
      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      
      if (checkoutUrl && typeof window !== 'undefined') {
        const bounceUrl = `${API_URL}/payments/chapa-bounce?url=${encodeURIComponent(checkoutUrl)}`;
        // Open Chapa in a popup window so user stays on the app
        // When they close the popup or payment completes, they're back on the app
        const popupWidth = 420;
        const popupHeight = 700;
        const left = (window.screen.width - popupWidth) / 2;
        const top = (window.screen.height - popupHeight) / 2;
        const popup = window.open(
          bounceUrl,
          'chapa_payment',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        // If popup was blocked (e.g. by browser), fall back to same-tab navigation
        if (!popup || popup.closed) {
          window.open(bounceUrl, '_blank');
        } else {
          // Monitor the popup. If it closes before the main page is reloaded (which happens on success),
          // it means the user manually cancelled or closed the checkout.
          const txId = data.txId || data.data?.txId || data.id;
          let isSuccess = false;

          const messageHandler = (event: MessageEvent) => {
            if (event.data === 'deposit_success') {
              isSuccess = true;
              window.removeEventListener('message', messageHandler);
              // Call user profile refresh or similar if available, or just show toast
              toast.success(isEN ? 'Deposit Successful' : 'በትክክል ገብቷል', isEN ? 'Your balance has been updated.' : 'ሂሳብዎ ታድሷል።');
            }
          };
          window.addEventListener('message', messageHandler);

          const pollTimer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollTimer);
              window.removeEventListener('message', messageHandler);
              // Send cancel request only if not successful
              if (!isSuccess) {
                try {
                  if (txId && token) {
                    await fetch(`${API_URL}/payments/cancel-deposit`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ txId })
                    });
                  }
                } catch (e) {}
              }
            }
          }, 1000);
        }
      } else {
        toast.info(isEN ? 'Deposit Initiated' : 'ተጀምሯል', isEN ? 'Deposit request sent. Follow your provider instructions.' : 'የማስገባት ጥያቄ ተልኳል። መመሪያውን ይከተሉ።');
      }


      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error('[deposit]', e);
      toast.error(isEN ? 'Deposit Error' : 'ስህተት', e?.message || (isEN ? 'Deposit failed. Check your connection.' : 'ማስገባት አልተቻለም። ግንኙነትዎን ያረጋግጡ።'));
    } finally {

      setLoading(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </Pressable>
      
      <View style={styles.container}>
        <Animated.View style={[styles.modal, { opacity, transform: [{ scale }] }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <LinearGradient colors={['rgba(167,139,250,0.2)', 'rgba(0,218,243,0.1)']} style={StyleSheet.absoluteFill} />
              <Ionicons name="add-circle" size={24} color="#a78bfa" />
            </View>
            <View>
              <Text style={styles.title}>{isEN ? "Deposit Funds" : "ገንዘብ ማስገቢያ"}</Text>
              <Text style={styles.subTitle}>{isEN ? "Top up your balance instantly" : "ሂሳብዎን ወዲያውኑ ይሙሉ"}</Text>
            </View>

          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{isEN ? "AMOUNT (ETB)" : "የገንዘብ መጠን (ETB)"}</Text>

            <View style={[styles.inputWrapper, !!amtError && { borderColor: 'rgba(248,113,113,0.5)' }]}>
              <Text style={styles.currencyPrefix}>ETB</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={(t) => { const v = t.replace(/[^0-9]/g, ""); setAmount(v); validateAmount(v); }}
                placeholder="0"
                placeholderTextColor="rgba(167,139,250,0.3)"
                inputMode="decimal"
                selectionColor="#a78bfa"
              />
            </View>
            {!!amtError && <Text style={styles.errorText}>{amtError}</Text>}
          </View>

          <View style={styles.presetGrid}>
            {presets.map((p) => (
              <TouchableOpacity 
                key={p} 
                onPress={() => setAmount(p.toString())}
                style={[styles.presetBtn, amount === p.toString() && styles.presetBtnActive]}
              >
                <Text style={[styles.presetText, amount === p.toString() && styles.presetTextActive]}>+{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.methodSection}>
            <Text style={styles.label}>{isEN ? "PAYMENT METHOD" : "የክፍያ አማራጭ"}</Text>

            <TouchableOpacity 
              style={[styles.methodCard, styles.methodCardActive]}
            >
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
                <Ionicons name="card-outline" size={18} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>Chapa</Text>
                <Text style={styles.methodSub}>Card &amp; Bank Checkout</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#a78bfa" />
            </TouchableOpacity>
          </View>

          {/* ─── LIVE CTA BUTTON ─── */}
          <TouchableOpacity
            style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={() => {
              const amt = Number(amount);
              if (!amt || amt < 10 || amt > 100000) {
                toast.warning(isEN ? 'Invalid Amount' : 'የተሳሳተ መጠን', isEN ? 'Valid range is ETB 10 - 100,000' : 'በ 10 እና 100,000 መሃል ያስገቡ።');
                return;
              }
              // Check if user opted to skip the warning
              if (typeof window !== 'undefined' && window.localStorage?.getItem('xoet_skip_deposit_warning') === '1') {
                handleDeposit();
              } else {
                setShowWarning(true);
              }
            }}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7c4dff', '#a78bfa']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.ctaText}>{isEN ? "Deposit" : "አስገባ"}{Number(amount) > 0 ? ` • ETB ${Number(amount).toLocaleString()}` : ''}</Text>
                  </>

              }
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ─── BEFORE YOU PAY WARNING ─── */}
      {showWarning && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <View style={{ backgroundColor: '#0c1020', borderRadius: 24, padding: 20, width: '90%', maxWidth: 400, maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' }}>
            {/* Warning Icon */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.25)' }}>
                <Ionicons name="alert" size={28} color="#ffd700" />
              </View>
            </View>
            
            {/* Close */}
            <TouchableOpacity onPress={() => setShowWarning(false)} style={{ position: 'absolute', top: 16, right: 16 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 4 }}>
              {isEN ? 'Before You Pay' : 'ከመክፈልዎ በፊት'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
              {isEN ? 'Please read carefully to avoid payment issues' : 'የክፍያ ችግሮችን ለማስወገድ በጥንቃቄ ያንብቡ'}
            </Text>

            {/* Rules */}
            <ScrollView style={{ flexShrink: 1, marginBottom: 8 }} showsVerticalScrollIndicator={false}>
              {[
                { icon: 'key', color: '#ff6b6b', title: isEN ? 'One Chance for PIN' : 'የ PIN አንድ ዕድል', desc: isEN ? 'You get ONE attempt to enter your Telebirr/CBE PIN correctly. If you enter the wrong PIN, the payment will fail instantly.' : 'የ Telebirr/CBE PIN ን በትክክል ለማስገባት አንድ ዕድል ብቻ ይኖርዎታል።' },
                { icon: 'card', color: '#ffa726', title: isEN ? 'Check Your Account' : 'መለያዎን ያረጋግጡ', desc: isEN ? 'Make sure your Telebirr or CBE account is active and has enough balance before continuing.' : 'Telebirr ወይም CBE መለያዎ ንቁ መሆኑን እና በቂ ሂሳብ እንዳለው ያረጋግጡ።' },
                { icon: 'refresh-circle', color: '#4dd0e1', title: isEN ? 'Failed? Start Fresh' : 'ካልተሳካ? እንደገና ይጀምሩ', desc: isEN ? 'If payment fails, do not retry on the same page. Come back here and start a new deposit.' : 'ክፍያ ካልተሳካ በዚያው ገጽ ላይ እንደገና አይሞክሩ። ይመለሱና አዲስ ያስገቡ።' },
                { icon: 'time', color: '#ab47bc', title: isEN ? "Don't Close the Browser" : 'ድረ-ገጹን አይዝጉ', desc: isEN ? 'Stay on the page while payment is processing. Closing the browser may cause the payment to hang.' : 'ክፍያ በሚሰራበት ጊዜ በገጹ ላይ ይቆዩ።' },
              ].map((rule, i) => (
                <View key={i} style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${rule.color}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={rule.icon as any} size={18} color={rule.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 }}>{rule.title}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16 }}>{rule.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Amount Display */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 2 }}>
                {isEN ? 'YOU ARE DEPOSITING' : 'የሚያስገቡት'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 }}>
                ETB {Number(amount).toLocaleString()}
              </Text>
            </View>

            {/* Don't show again checkbox */}
            <TouchableOpacity 
              onPress={() => setDontShowAgain(!dontShowAgain)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: dontShowAgain ? '#a78bfa' : 'rgba(255,255,255,0.2)', backgroundColor: dontShowAgain ? 'rgba(167,139,250,0.2)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {dontShowAgain && <Ionicons name="checkmark" size={14} color="#a78bfa" />}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' }}>
                {isEN ? "Don't show this again" : 'ይህን እንደገና አታሳየኝ'}
              </Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity 
              onPress={() => {
                if (dontShowAgain && typeof window !== 'undefined') {
                  window.localStorage?.setItem('xoet_skip_deposit_warning', '1');
                }
                setShowWarning(false);
                handleDeposit();
              }}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient colors={['#7c4dff', '#a78bfa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>
                  {isEN ? 'I Understand, Continue' : 'ተረድቻለሁ፣ ቀጥል'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════════════
// WITHDRAW MODAL
// Calls: POST /payments/withdraw → { ok, message }
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
export const WebWithdrawModal = ({ visible, onClose, user, token, onSuccess, language }: ModalProps) => {
  const isEN = language === 'en';
  const [amount, setAmount]   = useState('');
  const [amtError, setAmtError] = useState('');
  const [currentMethod, setCurrentMethod] = useState('TELEBIRR');
  const [showGameWarning, setShowGameWarning] = useState(false);
  
  const defaultPhone = user?.number || (user as any)?.phone_number || (user as any)?.phone || "";
  const [accountNumber, setAccountNumber] = useState(defaultPhone);

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const { opacity, scale }    = useModalAnim(visible);
  const toast = useToast();

  const totalGames = (user as any)?.total_games ?? 0;
  const hasPlayedMatch = totalGames > 0;

  useEffect(() => {
    if (visible) {
      setAccountNumber(user?.number || "");
      setIsSuccess(false);
      setSubmittedData(null);
    }
  }, [visible, user?.number]);

  if (!visible) return null;

  const withdrawable = Number(user?.withdrawable_balance || 0);
  const presets = [100, 500, 1000, 2000];

  const validateAmount = (val: string) => {
    const n = Number(val);
    if (val && (!n || n < MIN_PAYOUT)) {
      setAmtError(isEN ? `Min: ETB ${MIN_PAYOUT}` : `ቢያንስ ${MIN_PAYOUT} ብር`);
    } else if (val && n > 25000) {
      setAmtError(isEN ? "Max withdrawal is ETB 25,000" : "ከ 25,000 ብር በላይ ማውጣት አይቻልም");
    } else if (val && n > withdrawable) {
      setAmtError(isEN ? "Insufficient balance" : "በቂ ሂሳብ የሎትም");
    } else {
      setAmtError('');
    }
  };

  const handleWithdraw = async () => {
    if (!hasPlayedMatch) {
      setShowGameWarning(true);
      return;
    }
    const amt = Number(amount);
    if (!amt || amt < MIN_PAYOUT || amt > withdrawable || amt > 25000) {
      toast.warning(isEN ? 'Invalid Amount' : 'የተሳሳተ መጠን', isEN ? 'Please enter a valid withdrawal amount.' : 'እባክዎ ትክክለኛ መጠን ያስገቡ።');
      return;
    }
    if (!accountNumber) {
      toast.warning(isEN ? 'Missing Account' : 'አካውንት ያስገቡ', isEN ? 'Please enter your phone/account number.' : 'እባክዎ ስልክ ቁጥርዎን ያስገቡ።');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/payments/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          payoutMethod: currentMethod,
          payoutDestination: accountNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Withdrawal failed');

      // Check for checkout_url (some withdrawals might require OTP or verification)
      const checkoutUrl = data.checkout_url;

      if (checkoutUrl && typeof window !== 'undefined') {
        const bounceUrl = `${API_URL}/payments/chapa-bounce?url=${encodeURIComponent(checkoutUrl)}`;
        window.location.href = bounceUrl;
        return;
      }

      setSubmittedData({
        amount: amt,
        method: currentMethod,
        destination: accountNumber,
        status: data.chapaStatus || 'pending',
        reasons: data.reviewReason
      });
      setIsSuccess(true);
      haptics.success();
      onSuccess?.();
      setAmount('');
    } catch (e: any) {
      toast.error(isEN ? 'Withdrawal Failed' : 'ስህተት', e.message || (isEN ? 'Could not process withdrawal.' : 'ማውጣት አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </Pressable>
      
      <View style={styles.container}>
        <Animated.View style={[styles.modal, { opacity, transform: [{ scale }], padding: 20 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(0,218,243,0.1)', width: 40, height: 40 }]}>
                <Ionicons name={isSuccess ? "checkmark-circle" : "send"} size={20} color={isSuccess ? "#10b981" : "#00daf3"} />
              </View>
              <View>
                <Text style={[styles.title, { fontSize: 18 }]}>
                  {isSuccess ? (isEN ? "Request Received" : "ጥያቄው ተቀብለናል") : (isEN ? "Withdraw Funds" : "ገንዘብ ማውጫ")}
                </Text>
                <Text style={styles.subTitle}>
                  {isSuccess ? (isEN ? "Transaction is processing" : "ሂደቱ እየተካሄደ ነው") : (isEN ? "Transfer to your wallet" : "ወደ አካውንትዎ ያስተላልፉ")}
                </Text>
              </View>
            </View>

            {isSuccess ? (
              <View style={{ marginTop: 24, padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                   <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Ionicons name="checkmark" size={32} color="#10b981" />
                   </View>
                   <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>ETB {submittedData?.amount?.toLocaleString()}</Text>
                   <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                      {isEN ? "Withdrawal Summary" : "የማውጣት ዝርዝር"}
                   </Text>
                </View>

                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 }}>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isEN ? "Method" : "መንገድ"}</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{submittedData?.method}</Text>
                   </View>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isEN ? "Account" : "አካውንት"}</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{submittedData?.destination}</Text>
                   </View>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{isEN ? "Status" : "ሁኔታ"}</Text>
                      <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800' }}>
                          {submittedData?.status === 'pending_manual' ? (isEN ? 'ADMIN REVIEW' : 'በአድሚን ዕይታ') : (isEN ? 'PROCESSING' : 'በሂደት ላይ')}
                        </Text>
                      </View>
                   </View>
                </View>

                {submittedData?.reasons && (
                  <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.1)' }}>
                    <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800', marginBottom: 4 }}>{isEN ? "SECURITY NOTE" : "የደህንነት ማስታወሻ"}</Text>
                    <Text style={{ color: 'rgba(245,158,11,0.7)', fontSize: 10 }}>{isEN ? "Your request triggered an AML check and will be manually approved by an admin shortly." : "ጥያቄዎ የደህንነት ፍተሻ ስለገጠመው በአጭር ጊዜ ውስጥ በአድሚን ይረጋገጣል።"}</Text>
                  </View>
                )}

                <TouchableOpacity 
                   onPress={onClose}
                   style={{ marginTop: 24, backgroundColor: '#10b981', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                >
                   <Text style={{ color: '#fff', fontWeight: '800' }}>{isEN ? "Finish" : "ጨርስ"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
            <View style={[styles.balanceSummary, { padding: 16, marginBottom: 16 }]}>
              <View>
                <Text style={styles.balanceLabel}>{isEN ? "WITHDRAWABLE" : "ሊወጣ የሚችል"}</Text>
                <Text style={[styles.balanceValue, { fontSize: 20 }]}>ETB {withdrawable.toLocaleString()}</Text>
              </View>
              <Ionicons name="wallet-outline" size={28} color="rgba(167,139,250,0.3)" />
            </View>

            {/* 1. AMOUNT INPUT */}
            <View style={[styles.inputContainer, { marginBottom: 12 }]}>
              <Text style={styles.label}>{isEN ? "AMOUNT (ETB)" : "የገንዘብ መጠን (ETB)"}</Text>
              <View style={[styles.inputWrapper, { height: 50 }, !!amtError && { borderColor: 'rgba(248,113,113,0.5)' }]}>
                <Text style={styles.currencyPrefix}>ETB</Text>
                <TextInput
                  style={[styles.input, { fontSize: 18 }]}
                  value={amount}
                  onChangeText={(t) => { const v = t.replace(/[^0-9]/g, ""); setAmount(v); validateAmount(v); }}
                  placeholder="0"
                  placeholderTextColor="rgba(167,139,250,0.3)"
                  inputMode="numeric"
                />
              </View>
              {!!amtError && <Text style={styles.errorText}>{amtError}</Text>}
            </View>

            <View style={[styles.presetGrid, { marginBottom: 16 }]}>
              {presets.map((p) => (
                <TouchableOpacity 
                  key={p} 
                  onPress={() => { setAmount(p.toString()); validateAmount(p.toString()); }}
                  style={[styles.presetBtn, { paddingVertical: 8 }, amount === p.toString() && styles.presetBtnActive]}
                >
                  <Text style={[styles.presetText, { fontSize: 12 }, amount === p.toString() && styles.presetTextActive]}>+{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. PHONE INPUT */}
            <View style={[styles.inputContainer, { marginBottom: 16 }]}>
              <Text style={styles.label}>{isEN ? "RECIPIENT ACCOUNT / PHONE" : "የአካውንት/ስልክ ቁጥር"}</Text>
              <View style={[styles.inputWrapper, { height: 50 }]}>
                <TextInput
                  style={[styles.input, { fontSize: 18 }]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="251..."
                  placeholderTextColor="rgba(167,139,250,0.3)"
                  inputMode="tel"
                />
              </View>
            </View>

            {/* 3. PAYOUT METHOD */}
            <View style={[styles.methodSection, { marginBottom: 20 }]}>
              <Text style={styles.label}>{isEN ? "PAYOUT METHOD" : "የማውጫ አማራጭ"}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'TELEBIRR', label: 'TELEBIRR', img: require('../assets/images/telebirr.png') },
                  { id: 'CBE', label: 'CBE', img: require('../assets/images/cbe.png') },
                  { id: 'MPESA', label: 'MPESA', img: require('../assets/images/mpasaa.png') }
                ].map((m) => (
                  <TouchableOpacity 
                    key={m.id}
                    onPress={() => setCurrentMethod(m.id)}
                    style={[styles.methodCardSmall, { flex: 1, minWidth: 90, padding: 8 }, currentMethod === m.id && styles.methodCardActive]}
                  >
                    <Image source={m.img} style={{ width: 24, height: 24, borderRadius: 6 }} />
                    <Text style={[styles.methodNameSmall, { fontSize: 11 }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleWithdraw}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00daf3', '#0891b2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.ctaGradient, { paddingVertical: 14 }]}
              >
                {loading
                  ? <ActivityIndicator color="#060614" size="small" />
                  : <>
                      <Ionicons name="arrow-forward" size={18} color="#060614" />
                      <Text style={[styles.ctaText, { color: '#060614' }]}>{isEN ? "Withdraw" : "አውጣ"}{Number(amount) > 0 ? ` • ETB ${Number(amount).toLocaleString()}` : ''}</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.hintText, { textAlign: 'center', marginTop: 10 }]}>{isEN ? "Double check your details" : "እባክዎን መረጃዎን ደግመው ያረጋግጡ"}</Text>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {showGameWarning && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.85)' }]}>
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
    </View>
  );
};

// ─── Shared Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  } as any,
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(6,6,20,0.97)',
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  modalIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(167,139,250,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  subTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  label: { color: 'rgba(167,139,250,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  inputContainer: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    paddingHorizontal: 16, 
    height: 58,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', gap: 10,
  },
  currencyPrefix: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '800', flexShrink: 0 },
  input: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '900', padding: 0, minWidth: 0 },
  presetGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  presetBtnActive: { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.25)' },
  presetText: { color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 13 },
  presetTextActive: { color: '#a78bfa' },
  methodSection: { marginBottom: 24 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10,
  },
  methodCardActive: { backgroundColor: 'rgba(167,139,250,0.04)', borderColor: 'rgba(167,139,250,0.2)' },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  methodSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  methodCardSmall: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  methodIconSmall: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  methodNameSmall: { color: '#fff', fontSize: 13, fontWeight: '800' },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  balanceSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.04)', padding: 20, borderRadius: 18, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.08)',
  },
  balanceLabel: { color: 'rgba(167,139,250,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  balanceValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  errorText: { color: '#f87171', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 2 },
  hintText: { color: 'rgba(167,139,250,0.5)', fontSize: 11, fontWeight: '600', marginTop: 6, marginLeft: 2 },
});
