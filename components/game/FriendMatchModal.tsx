// components/game/FriendMatchModal.tsx — Challenge a friend with room lock checks + send cooldown
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/authContext';

const BET_OPTIONS = [10, 15, 25, 50, 99, 100, 250, 500];
const CAP_LIMIT = 25;
const SEND_COOLDOWN_MS = 45000;

// Check if a bet amount is capped (locked) for a user based on their wins
function isBetCapped(caps: any, amount: number): boolean {
  if (!caps) return false;
  if (amount === 10) return (caps.r1_10 || 0) >= CAP_LIMIT;
  if (amount === 25) return (caps.r1_25 || 0) >= CAP_LIMIT;
  if (amount === 50) return (caps.r1_50 || 0) >= CAP_LIMIT;
  if (amount === 99) return (caps.r1_99 || 0) >= CAP_LIMIT;
  return false;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendInvite: (username: string, betAmount: number) => void;
  inviteResult: any;
}

export default function FriendMatchModal({ visible, onClose, onSendInvite, inviteResult }: Props) {
  const { t, language } = useAuth();
  const isEN = language === "en";
  const [username, setUsername] = useState('');
  const [selectedBet, setSelectedBet] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  const cooldownRef = useRef<any>(null);

  const target = inviteResult?.target;
  const senderBalance = inviteResult?.senderBalance || 0;
  const targetBalance = inviteResult?.targetBalance || 0;
  const senderCaps = inviteResult?.senderCaps;
  const targetCaps = inviteResult?.targetCaps;
  const wasDeclined = inviteResult?.declined === true;

  const statusColor = target?.status === 'online' ? '#34d399' : target?.status === 'in_game' ? '#f87171' : '#64748b';
  const statusLabel = target?.status === 'online' ? (isEN ? 'Online' : 'መስመር ላይ') : target?.status === 'in_game' ? (isEN ? 'In Game' : 'በጨዋታ ላይ') : (isEN ? 'Offline' : 'ከመስመር ውጭ');

  const handleSearch = () => {
    if (!username.trim()) return;
    setSearching(true);
    setSelectedBet(null);
    onSendInvite(username.trim(), 0);
  };

  const handleInvite = () => {
    if (!selectedBet || !target || cooldown > 0) return;
    onSendInvite(username.trim(), selectedBet);

    // Start 5-second cooldown
    setCooldown(45);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (inviteResult) setSearching(false);
  }, [inviteResult]);

  // When declined, stop the cooldown so they can resend immediately
  useEffect(() => {
    if (wasDeclined) {
      setCooldown(0);
      if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
    }
  }, [wasDeclined]);

  useEffect(() => {
    if (!visible) {
      setUsername('');
      setSelectedBet(null);
      setSearching(false);
      setCooldown(0);
      if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
    }
  }, [visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const getLockInfo = (amt: number): { locked: boolean; reason: string } => {
    // 1. Balance check (both players must afford)
    const senderCantAfford = senderBalance < amt;
    const targetCantAfford = targetBalance < amt;

    if (senderCantAfford) return { locked: true, reason: isEN ? 'Low balance' : 'ዝቅተኛ ሂሳብ' };
    if (targetCantAfford) return { locked: true, reason: isEN ? "They can't afford" : "የበቂ ሂሳብ የላቸውም" };

    // 2. Win cap check (15-win cap for 10 & 15 Birr)
    const CAP_LIMIT_VAL = 15;
    if (amt === 10) {
      const senderCapped = (senderCaps?.r1_10 || 0) >= CAP_LIMIT_VAL;
      const targetCapped = (targetCaps?.r1_10 || 0) >= CAP_LIMIT_VAL;
      if (senderCapped) return { locked: true, reason: isEN ? 'Win cap reached' : 'ገደብ ላይ ደርሰዋል' };
      if (targetCapped) return { locked: true, reason: isEN ? 'Friend capped' : 'ተጋባዡ ገደብ ላይ ደርሷል' };
    }
    if (amt === 15) {
      const senderCapped = (senderCaps?.r1_15 || 0) >= CAP_LIMIT_VAL;
      const targetCapped = (targetCaps?.r1_15 || 0) >= CAP_LIMIT_VAL;
      if (senderCapped) return { locked: true, reason: isEN ? 'Win cap reached' : 'ገደብ ላይ ደርሰዋል' };
      if (targetCapped) return { locked: true, reason: isEN ? 'Friend capped' : 'ተጋባዡ ገደብ ላይ ደርሷል' };
    }

    return { locked: false, reason: '' };
  };

  const isSendDisabled = !selectedBet || cooldown > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.header}>
            <Text style={s.title}>{isEN ? "Challenge a Friend" : "ከጓደኛ ጋር ይጫወቱ"}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#e5e3ff" />
            </TouchableOpacity>
          </View>

          {/* Username Search */}
          <Text style={s.label}>{isEN ? "OPPONENT USERNAME" : "የተቃዋሚ የተጠቃሚ ስም"}</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.input}
              placeholder={isEN ? "Enter username..." : "የተጠቃሚ ስም ያስገቡ..."}
              placeholderTextColor="rgba(168,167,212,0.4)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={searching || !username.trim()}>
              {searching ? <ActivityIndicator size="small" color="#0c0c1f" /> : <Ionicons name="search" size={18} color="#0c0c1f" />}
            </TouchableOpacity>
          </View>

          {/* Error Result */}
          {inviteResult && !inviteResult.ok && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#f87171" />
              <Text style={s.errorText}>
                {inviteResult.reason === 'user_not_found' ? (isEN ? 'User not found' : 'ተጠቃሚው አልተገኘም')
                  : inviteResult.reason === 'cannot_invite_self' ? (isEN ? 'Cannot invite yourself' : 'ራስዎን መጋበዝ አይችሉም')
                  : inviteResult.reason === 'invalid_bet' ? (isEN ? 'Invalid bet amount' : 'የተሳሳተ የውርርድ መጠን')
                  : (isEN ? 'Invite failed, try again' : 'መጋበዝ አልተቻለም፣ እንደገና ይሞክሩ')}
              </Text>
            </View>
          )}

          {/* Target Found */}
          {target && (
            <View style={s.targetCard}>
              <View style={s.targetRow}>
                <View style={s.avatar}><Text style={s.avatarText}>{target.username?.[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.targetName}>{target.username}</Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>

              {/* Your balance context */}
              <View style={s.balanceRow}>
                <Ionicons name="wallet-outline" size={14} color="#00daf3" />
                <Text style={s.balanceText}>{isEN ? "Your balance: " : "ቀሪ ሂሳብዎ: "}<Text style={{ color: '#e5e3ff', fontWeight: '900' }}>{senderBalance.toLocaleString()} {isEN ? "ETB" : "ብር"}</Text></Text>
              </View>

              {/* Bet Selection */}
              <Text style={[s.label, { marginTop: 12 }]}>{isEN ? "SELECT BET AMOUNT" : "የውርርድ መጠን ይምረጡ"}</Text>
              <View style={s.betGrid}>
                {BET_OPTIONS.map(amt => {
                  const { locked, reason } = getLockInfo(amt);
                  const selected = selectedBet === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={[s.betBtn, selected && s.betBtnSelected, locked && s.betBtnLocked]}
                      onPress={() => !locked && setSelectedBet(amt)}
                      disabled={locked}
                    >
                      {locked && <Ionicons name="lock-closed" size={10} color="#64748b" style={{ position: 'absolute', top: 4, right: 4 }} />}
                      <Text style={[s.betText, selected && s.betTextSelected, locked && s.betTextLocked]}>{amt} {isEN ? "ETB" : "ብር"}</Text>
                      {locked && <Text style={s.lockedHint}>{reason}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Send Invite Button with Cooldown */}
              <TouchableOpacity
                style={[s.inviteBtn, isSendDisabled && { opacity: 0.4 }]}
                onPress={handleInvite}
                disabled={isSendDisabled}
              >
                {cooldown > 0 ? (
                  <>
                    <View style={s.cooldownCircle}>
                      <ActivityIndicator size="small" color="#0c0c1f" />
                    </View>
                    <Text style={s.inviteBtnText}>{t("waiting_response")}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#0c0c1f" />
                    <Text style={s.inviteBtnText}>
                      {isEN ? `Send Challenge (${selectedBet || '...'} ETB)` : `ግብዣ ላክ (${selectedBet || '...'} ብር)`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {target.status !== 'online' && target.status !== 'in_game' && (
                <Text style={s.offlineHint}>{isEN ? "⚠️ Player is offline — invite will be sent when they come online" : "⚠️ ተጫዋቹ ከመስመር ውጭ ነው — መስመር ላይ ሲገባ ግብዣው ይላካል"}</Text>
              )}
              {target.status === 'in_game' && (
                <Text style={s.offlineHint}>{isEN ? "⚠️ Player is currently in a game — they'll see your invite after" : "⚠️ ተጫዋቹ በአሁኑ ጊዜ በጨዋታ ላይ ነው — ከጨዋታው በኋላ ግብዣዎን ያያል"}</Text>
              )}
              {wasDeclined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' }}>
                  <Ionicons name="close-circle" size={18} color="#f87171" />
                  <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '800' }}>{inviteResult?.declinedByUsername || target?.username || 'Your friend'} {t("declined_invite")}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(6,6,20,0.92)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  box: { width: '100%', maxWidth: 440, backgroundColor: '#111128', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(68,68,107,0.2)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#e5e3ff', fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  label: { color: 'rgba(168,167,212,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: { flex: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 14, color: '#e5e3ff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(68,68,107,0.2)' },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#00e3fd', alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: 12, marginBottom: 12 },
  errorText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  targetCard: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,227,253,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#00e3fd', fontSize: 16, fontWeight: '900' },
  targetName: { color: '#e5e3ff', fontSize: 16, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,218,243,0.06)', borderRadius: 10 },
  balanceText: { color: '#00daf3', fontSize: 11, fontWeight: '600' },
  betGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  betBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(68,68,107,0.2)', minWidth: 70, alignItems: 'center' },
  betBtnSelected: { backgroundColor: 'rgba(0,227,253,0.15)', borderColor: '#00e3fd' },
  betBtnLocked: { opacity: 0.4 },
  betText: { color: '#e5e3ff', fontSize: 12, fontWeight: '700' },
  betTextSelected: { color: '#00e3fd' },
  betTextLocked: { color: '#475569' },
  lockedHint: { color: '#64748b', fontSize: 7, fontWeight: '600', marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, backgroundColor: '#00e3fd', borderRadius: 14 },
  inviteBtnText: { color: '#0c0c1f', fontSize: 13, fontWeight: '800' },
  cooldownCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#0c0c1f', alignItems: 'center', justifyContent: 'center' },
  cooldownText: { color: '#0c0c1f', fontSize: 13, fontWeight: '900' },
  offlineHint: { color: '#64748b', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
