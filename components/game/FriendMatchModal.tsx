// components/game/FriendMatchModal.tsx — Challenge a friend with room lock checks + send cooldown
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/authContext';
import { colors, radius, space } from '../../theme/tokens';
import Avatar from '../ui/Avatar';

const BET_OPTIONS = [10, 15, 25, 50, 99, 100, 250, 500];
const RPS_BET_OPTIONS = [10, 25, 50, 100];
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
  gameType?: 'xo' | 'rps';
}

export default function FriendMatchModal({ visible, onClose, onSendInvite, inviteResult, gameType = 'xo' }: Props) {
  const { t, language } = useAuth();
  const isEN = language === "en";
  const isRps = gameType === 'rps';
  const activeBets = isRps ? RPS_BET_OPTIONS : BET_OPTIONS;
  const primaryColor = isRps ? colors.gold : colors.primary;
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

  const statusColor = target?.status === 'online' ? colors.successSoft : target?.status === 'in_game' ? colors.dangerSoft : colors.textMuted;
  const statusLabel = target?.status === 'online' ? (isEN ? 'Online' : 'መስመር ላይ') : target?.status === 'in_game' ? (isEN ? 'In game' : 'በጨዋታ ላይ') : (isEN ? 'Offline' : 'ከመስመር ውጭ');

  const handleSearch = () => {
    if (!username.trim()) return;
    setSearching(true);
    setSelectedBet(null);
    onSendInvite(username.trim(), 0);
  };

  const handleInvite = () => {
    if (!selectedBet || !target || cooldown > 0) return;
    onSendInvite(username.trim(), selectedBet);

    // Short 3-second debounce to prevent accidental double-tap while allowing repeated challenges
    setCooldown(3);
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

    // 2. Win cap check (15-win cap applies to XO 10 & 15 Birr only, never RPS)
    if (!isRps) {
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
    }

    return { locked: false, reason: '' };
  };

  const isTargetOnline = target?.status === 'online';
  const isSendDisabled = !isTargetOnline || !selectedBet || cooldown > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.header}>
            <Text style={s.title}>
              {isEN 
                ? (isRps ? "Challenge a friend to RPS" : "Challenge a friend") 
                : (isRps ? "ሮክ ፔፐር ሲዘርስ — ከጓደኛ ጋር ይጫወቱ" : "ከጓደኛ ጋር ይጫወቱ")}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          {/* Username Search */}
          <Text style={s.label}>{isEN ? "Opponent username" : "የተቃዋሚ የተጠቃሚ ስም"}</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.input}
              placeholder={isEN ? "Enter username" : "የተጠቃሚ ስም ያስገቡ"}
              placeholderTextColor={colors.textFaint}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
            />
            <TouchableOpacity style={[s.searchBtn, { backgroundColor: primaryColor }]} onPress={handleSearch} disabled={searching || !username.trim()} accessibilityRole="button" accessibilityLabel="Search player">
              {searching ? <ActivityIndicator size="small" color={colors.bgDeep} /> : <Ionicons name="search" size={18} color={colors.bgDeep} />}
            </TouchableOpacity>
          </View>

          {/* Error Result */}
          {inviteResult && !inviteResult.ok && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.dangerSoft} />
              <Text style={s.errorText}>
                {inviteResult.reason === 'user_not_found' ? (isEN ? 'Player not found. Check the username.' : 'ተጠቃሚው አልተገኘም')
                  : inviteResult.reason === 'cannot_invite_self' ? (isEN ? 'Enter a different player username.' : 'ራስዎን መጋበዝ አይችሉም')
                  : inviteResult.reason === 'invalid_bet' ? (isEN ? 'Select a valid stake amount.' : 'የተሳሳተ የውርርድ መጠን')
                  : (isEN ? 'Could not send challenge. Please try again.' : 'መጋበዝ አልተቻለም፣ እንደገና ይሞክሩ')}
              </Text>
            </View>
          )}

          {/* Target Found */}
          {target && (
            <View style={s.targetCard}>
              <View style={s.targetRow}>
                <Avatar
                  uri={(target as any)?.avatar}
                  name={target.username}
                  size="md"
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.targetName}>{target.username}</Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>

              {/* Availability notice before stake selection */}
              {target.status !== 'online' && (
                <View style={s.availabilityNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
                  <Text style={s.offlineHint}>
                    {target.status === 'in_game'
                      ? (isEN ? "Player is in a match right now. Refresh search once their match finishes." : "ተጫዋቹ አሁን በጨዋታ ላይ ነው። ጨዋታው ሲያልቅ እንደገና ይፈልጉ።")
                      : (isEN ? "Player is currently offline. Challenges can only be sent when they are online." : "ተጫዋቹ ከመስመር ውጭ ነው። ግብዣ መላክ የሚቻለው መስመር ላይ ሲሆኑ ብቻ ነው።")}
                  </Text>
                </View>
              )}

              {/* Your balance context */}
              <View style={[s.balanceRow, isRps && { backgroundColor: colors.tintGold }]}>
                <Ionicons name="wallet-outline" size={14} color={primaryColor} />
                <Text style={[s.balanceText, { color: primaryColor }]}>{isEN ? "Your balance: " : "ቀሪ ሂሳብዎ: "}<Text style={{ color: colors.text, fontWeight: '800' }}>{senderBalance.toLocaleString()} {isEN ? "ETB" : "ብር"}</Text></Text>
              </View>

              {/* Bet Selection */}
              <Text style={[s.label, { marginTop: space.md }]}>{isEN ? "Select stake" : "የውርርድ መጠን ይምረጡ"}</Text>
              <View style={s.betGrid}>
                {activeBets.map(amt => {
                  const { locked, reason } = getLockInfo(amt);
                  const selected = selectedBet === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        s.betBtn,
                        selected && [s.betBtnSelected, { borderColor: primaryColor, backgroundColor: isRps ? colors.tintGold : colors.tintPrimary }],
                        locked && s.betBtnLocked,
                      ]}
                      onPress={() => !locked && setSelectedBet(amt)}
                      disabled={locked}
                    >
                      {locked && <Ionicons name="lock-closed" size={10} color={colors.textMuted} style={{ position: 'absolute', top: 4, right: 4 }} />}
                      <Text style={[s.betText, selected && { color: primaryColor }, locked && s.betTextLocked]}>{amt} {isEN ? "ETB" : "ብር"}</Text>
                      {locked && <Text style={s.lockedHint}>{reason}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Send Invite Button with Cooldown */}
              <TouchableOpacity
                style={[s.inviteBtn, { backgroundColor: primaryColor }, isSendDisabled && { opacity: 0.45 }]}
                onPress={handleInvite}
                disabled={isSendDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  !isTargetOnline
                    ? (isEN ? "Opponent is offline" : "ተጫዋቹ ከመስመር ውጭ ነው")
                    : selectedBet
                      ? (isEN ? `Send challenge for ${selectedBet} ETB` : `ግብዣ ላክ (${selectedBet} ብር)`)
                      : (isEN ? "Select a stake to send challenge" : "የውርርድ መጠን ይምረጡ")
                }
              >
                {cooldown > 0 ? (
                  <>
                    <View style={s.cooldownCircle}>
                      <ActivityIndicator size="small" color={colors.bgDeep} />
                    </View>
                    <Text style={s.inviteBtnText} numberOfLines={1}>{t("waiting_response")}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name={isTargetOnline ? "paper-plane" : "time-outline"} size={18} color={colors.bgDeep} />
                    <Text style={s.inviteBtnText} numberOfLines={1}>
                      {!isTargetOnline
                        ? (target.status === 'in_game' ? (isEN ? "Player is in a match" : "ተጫዋቹ በጨዋታ ላይ ነው") : (isEN ? "Player is offline" : "ተጫዋቹ ከመስመር ውጭ ነው"))
                        : selectedBet
                          ? (isEN ? `Send challenge — ${selectedBet} ETB` : `ግብዣ ላክ — ${selectedBet} ብር`)
                          : (isEN ? "Select a stake" : "የውርርድ መጠን ይምረጡ")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {wasDeclined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: colors.tintDanger, borderRadius: radius.md, marginTop: space.md, borderWidth: 1, borderColor: colors.danger }}>
                  <Ionicons name="close-circle" size={22} color={colors.dangerSoft} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.dangerSoft, fontSize: 13, fontWeight: '800' }}>
                      {inviteResult?.declinedByUsername || target?.username || (isEN ? 'Opponent' : 'ተጋባዡ')} {isEN ? "declined your challenge" : "ግብዣዎን አልተቀበለም"}
                    </Text>
                    <Text style={{ color: colors.textSoft, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                      {isEN ? "Send another challenge or pick a different stake." : "እንደገና መጋበዝ ወይም ሌላ መጠን መምረጥ ይችላሉ።"}
                    </Text>
                  </View>
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
  overlay: { flex: 1, backgroundColor: 'rgba(6,6,20,0.92)', justifyContent: 'center', alignItems: 'center', padding: space.lg },
  box: { width: '100%', maxWidth: 440, backgroundColor: colors.card, borderRadius: radius.xl, padding: space.xxl, borderWidth: 1, borderColor: colors.borderStrong },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xl },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', flex: 1, paddingRight: space.sm },
  closeBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: space.sm },
  searchRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  input: { flex: 1, minHeight: 44, backgroundColor: colors.cardRaised, borderRadius: radius.md, paddingHorizontal: space.lg, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.borderStrong },
  searchBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, backgroundColor: colors.tintDanger, borderRadius: radius.md, marginBottom: space.md },
  errorText: { color: colors.dangerSoft, fontSize: 12, fontWeight: '700', flex: 1 },
  targetCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  targetName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill },
  statusText: { fontSize: 12, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: colors.tintPrimary, borderRadius: radius.md },
  balanceText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  betGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  betBtn: { minHeight: 44, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: colors.cardRaised, borderWidth: 1, borderColor: colors.border, minWidth: 76, alignItems: 'center', justifyContent: 'center' },
  betBtnSelected: { backgroundColor: colors.tintPrimary, borderColor: colors.primary },
  betBtnLocked: { opacity: 0.4 },
  betText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  betTextLocked: { color: colors.textFaint },
  lockedHint: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 48, paddingHorizontal: space.lg, backgroundColor: colors.primary, borderRadius: radius.md },
  inviteBtnText: { color: colors.bgDeep, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  cooldownCircle: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  availabilityNotice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: colors.tintGold, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold },
  offlineHint: { flex: 1, color: colors.goldSoft, fontSize: 12, fontWeight: '600', lineHeight: 16 },
});
