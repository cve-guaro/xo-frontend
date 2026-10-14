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
  onSuccess?: () => void;
  language?: string;
}

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
              <Ionicons name="wallet-outline" size={28} color="rgba(0,218,243,0.3)" />
            </View>

            <View style={[styles.inputContainer, { marginBottom: 12 }]}>
              <Text style={styles.label}>{isEN ? "AMOUNT (ETB)" : "የገንዘብ መጠን (ETB)"}</Text>
              <View style={[styles.inputWrapper, { height: 50 }, !!amtError && { borderColor: 'rgba(248,113,113,0.5)' }]}>
                <Text style={styles.currencyPrefix}>ETB</Text>
                <TextInput
                  style={[styles.input, { fontSize: 18 }]}
                  value={amount}
                  onChangeText={(t) => { const v = t.replace(/[^0-9]/g, ""); setAmount(v); validateAmount(v); }}
                  placeholder="0"
                  placeholderTextColor="rgba(0,218,243,0.3)"
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

            <View style={[styles.inputContainer, { marginBottom: 16 }]}>
              <Text style={styles.label}>{isEN ? "RECIPIENT ACCOUNT / PHONE" : "የአካውንት/ስልክ ቁጥር"}</Text>
              <View style={[styles.inputWrapper, { height: 50 }]}>
                <TextInput
                  style={[styles.input, { fontSize: 18 }]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="251..."
                  placeholderTextColor="rgba(0,218,243,0.3)"
                  inputMode="tel"
                />
              </View>
            </View>

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
    backgroundColor: 'rgba(0,218,243,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  subTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  label: { color: 'rgba(0,218,243,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  inputContainer: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    paddingHorizontal: 16, 
    height: 58,
    borderWidth: 1, borderColor: 'rgba(0,218,243,0.15)', gap: 10,
  },
  currencyPrefix: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '800', flexShrink: 0 },
  input: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '900', padding: 0, minWidth: 0 },
  presetGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  presetBtnActive: { backgroundColor: 'rgba(0,218,243,0.08)', borderColor: 'rgba(0,218,243,0.25)' },
  presetText: { color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 13 },
  presetTextActive: { color: '#00daf3' },
  methodSection: { marginBottom: 24 },
  methodCardSmall: {
    flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  methodCardActive: { backgroundColor: 'rgba(0,218,243,0.04)', borderColor: 'rgba(0,218,243,0.2)' },
  methodNameSmall: { color: '#fff', fontWeight: '800' },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  balanceSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,218,243,0.04)', padding: 20, borderRadius: 18, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(0,218,243,0.08)',
  },
  balanceLabel: { color: 'rgba(0,218,243,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  balanceValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  errorText: { color: '#f87171', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 2 },
  hintText: { color: 'rgba(0,218,243,0.5)', fontSize: 11, fontWeight: '600', marginTop: 6, marginLeft: 2 },
});
