import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, Pressable, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';
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
          amount: amt,
          provider: 'CHAPA',
          clientRef: `deposit_${user?.id}_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(isEN ? 'Deposit Failed' : 'ማስገባት አልተቻለም', data.detail || (isEN ? 'Could not initiate deposit.' : 'ሂደቱን መጀመር አልተቻለም።'));
        return;
      }

      const checkoutUrl = data.checkout_url || data.data?.checkout_url;
      
      if (checkoutUrl && typeof window !== 'undefined') {
        const bounceUrl = `${API_URL}/payments/chapa-bounce?url=${encodeURIComponent(checkoutUrl)}`;
        window.location.href = bounceUrl;
        return;
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
              <LinearGradient colors={['rgba(0,218,243,0.2)', 'rgba(0,218,243,0.1)']} style={StyleSheet.absoluteFill} />
              <Ionicons name="add-circle" size={24} color="#00daf3" />
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
                placeholderTextColor="rgba(0,218,243,0.3)"
                inputMode="decimal"
                selectionColor="#00daf3"
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
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(0,218,243,0.12)' }]}>
                <Ionicons name="card-outline" size={18} color="#00daf3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>Chapa</Text>
                <Text style={styles.methodSub}>Card &amp; Bank Checkout</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#00daf3" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={() => {
              const amt = Number(amount);
              if (!amt || amt < 10 || amt > 100000) {
                toast.warning(isEN ? 'Invalid Amount' : 'የተሳሳተ መጠን', isEN ? 'Valid range is ETB 10 - 100,000' : 'በ 10 እና 100,000 መሃል ያስገቡ።');
                return;
              }
              handleDeposit();
            }}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00daf3', '#00a3ff']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading
                ? <ActivityIndicator color="#0B0B0F" size="small" />
                : <>
                    <Ionicons name="flash" size={18} color="#0B0B0F" />
                    <Text style={styles.ctaText}>{isEN ? "Deposit" : "አስገባ"}{Number(amount) > 0 ? ` • ETB ${Number(amount).toLocaleString()}` : ''}</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {showWarning && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <View style={{ backgroundColor: '#0c1020', borderRadius: 24, padding: 20, width: '90%', maxWidth: 400, maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.25)' }}>
                <Ionicons name="alert" size={28} color="#ffd700" />
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setShowWarning(false)} style={{ position: 'absolute', top: 16, right: 16 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 4 }}>
              {isEN ? 'Before You Pay' : 'ከመክፈልዎ በፊት'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
              {isEN ? 'Please read carefully to avoid payment issues' : 'የክፍያ ችግሮችን ለማስወገድ በጥንቃቄ ያንብቡ'}
            </Text>

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

            <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 2 }}>
                {isEN ? 'YOU ARE DEPOSITING' : 'የሚያስገቡት'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 }}>
                ETB {Number(amount).toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setDontShowAgain(!dontShowAgain)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: dontShowAgain ? '#00daf3' : 'rgba(255,255,255,0.2)', backgroundColor: dontShowAgain ? 'rgba(0,218,243,0.2)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {dontShowAgain && <Ionicons name="checkmark" size={14} color="#00daf3" />}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' }}>
                {isEN ? "Don't show this again" : 'ይህን እንደገና አታሳየኝ'}
              </Text>
            </TouchableOpacity>

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
              <LinearGradient colors={['#00daf3', '#00a3ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={18} color="#0B0B0F" />
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
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10,
  },
  methodCardActive: { backgroundColor: 'rgba(0,218,243,0.04)', borderColor: 'rgba(0,218,243,0.2)' },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  methodSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  errorText: { color: '#f87171', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 2 },
});
