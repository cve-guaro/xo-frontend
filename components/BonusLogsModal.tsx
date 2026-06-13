import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/authContext';
import { API_URL } from '../config';

const BonusLogsModal = memo(function BonusLogsModal({ 
  visible, 
  onClose, 
  language 
}: { 
  visible: boolean; 
  onClose: () => void; 
  language: string;
}) {
  const isEN = language === "en";
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { token, showAlert } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/user/bonus-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (data.ok) setLogs(data.logs || []);
    } catch (e) {
      console.error("[logs] fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible) {
      fetchLogs();
    }
  }, [visible, fetchLogs]);

  const handleRedeem = async () => {
    if (!promoCode.trim() || !token) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/user/promocodes/redeem`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: promoCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(isEN ? "Success" : "ተሳክቷል", isEN ? `Successfully redeemed Gift!` : `የስጦታ ኮዱ ተቀባይነት አግኝቷል!`);
        setPromoCode("");
        fetchLogs(); // refresh list
      } else {
        showAlert(isEN ? "Redemption Failed" : "መቀበል አልተቻለም", data.error || (isEN ? "Invalid or expired code" : "የተሳሳተ ወይም ጊዜው ያለፈበት ኮድ"));
      }
    } catch (e) {
      showAlert(isEN ? "Error" : "ስህተት", isEN ? "Network failure" : "የኔትወርክ ችግር");
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    if (visible && token) {
      setLoading(true);
      fetch(`${API_URL}/user/bonus-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setLogs(data.logs || []);
      })
      .finally(() => setLoading(false));
    }
  }, [visible, token]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.modalOverlay, isDesktop && { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.bonusSheet, isDesktop && { width: '90%', maxWidth: 480, alignSelf: 'center', borderRadius: 32 }]}>
          {!isDesktop && <View style={styles.bonusSheetHandle} />}
          <View style={styles.bonusHeader}>

            <View style={styles.bonusIconBox}>
              <LinearGradient colors={["#00daf3", "#00838F"]} style={StyleSheet.absoluteFill} />
              <Ionicons name="gift-outline" size={20} color="#0B0B0F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusSheetTitle}>{isEN ? "Bonus Tracking Log" : "የቦነስ መከታተያ ታሪክ"}</Text>
              <Text style={styles.bonusSheetSub}>{isEN ? "View your reward history" : "የሽልማት ታሪክዎን ይመልከቱ"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.bonusCloseBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Promo Code Input Section */}
          <View style={styles.promoInputBox}>
            <TextInput
              style={styles.promoInput}
              placeholder={isEN ? "ENTER GIFT CODE" : "የስጦታ ኮድ ያስገቡ"}
              placeholderTextColor="rgba(0,218,243,0.3)"
              autoCapitalize="characters"
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity 
              onPress={handleRedeem}
              disabled={redeeming || !promoCode.trim()}
              style={[styles.promoBtn, (!promoCode.trim() || redeeming) && { opacity: 0.5 }]}
            >
              <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.promoBtnInner}>
                {redeeming ? <ActivityIndicator size="small" color="#0B0B0F" /> : <Ionicons name="gift" size={18} color="#0B0B0F" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.promoHint}>{isEN ? "Have a voucher? Claim it here." : "የስጦታ ኮድ አሎት? እዚህ ይቀበሉ::"}</Text>

          <View style={styles.bonusList}>
            {loading ? (
              <ActivityIndicator color="#00daf3" style={{ marginVertical: 40 }} />
            ) : logs.length === 0 ? (
              <View style={styles.emptyBonus}>
                <Ionicons name="calendar-outline" size={40} color="rgba(166,139,255,0.1)" />
                <Text style={styles.emptyBonusText}>{isEN ? "No logs recorded yet." : "እስካሁን ምንም ታሪክ የለም"}</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {logs.map((log, i) => (
                  <View key={i} style={styles.bonusItem}>
                    <View style={styles.bonusItemLeft}>
                      <Text style={styles.bonusItemReason}>{log.reason}</Text>
                      <Text style={styles.bonusItemDate}>{log.created_at && !isNaN(new Date(log.created_at).getTime()) ? new Date(log.created_at).toLocaleString() : '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.bonusItemAmount}>+ETB {Number(log.amount || 0).toFixed(2)}</Text>
                      <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '700', marginTop: 2 }}>{isEN ? 'CLAIMED' : 'ተወስዷል'}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.bonusDoneBtn}>
            <LinearGradient colors={["#00daf3", "#00a3ff"]} style={styles.bonusDoneInner}>
              <Text style={styles.bonusDoneText}>{isEN ? "CLOSE" : "ዝጋ"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  bonusSheet: {
    backgroundColor: '#121226',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bonusSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bonusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  bonusIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bonusSheetTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bonusSheetSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  bonusCloseBtn: { padding: 8 },
  bonusList: { flex: 1 },
  emptyBonus: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyBonusText: { color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: '700', fontSize: 13 },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  bonusItemLeft: { flex: 1 },
  bonusItemReason: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bonusItemDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, fontWeight: '600' },
  bonusItemAmount: { color: '#00daf3', fontSize: 15, fontWeight: '900' },
  bonusDoneBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  bonusDoneInner: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  bonusDoneText: { color: '#fff', fontWeight: '900', letterSpacing: 1.5 },
  promoInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.15)',
    paddingLeft: 16,
    paddingRight: 6,
    height: 54,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  promoBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoHint: {
    color: 'rgba(0,218,243,0.4)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
});

export default BonusLogsModal;
