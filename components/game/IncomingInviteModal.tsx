// components/game/IncomingInviteModal.tsx — Clean centered challenge card matching Image 2
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/authContext';
import { playTickSound } from '../../lib/pinTickAudio';
import { haptics } from '../../lib/haptcs';
import { colors } from '../../theme/tokens';

interface Props {
  invite: any; // { id, username, amount, gameType }
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingInviteModal({ invite, onAccept, onDecline }: Props) {
  const { language } = useAuth();
  const isEN = language !== 'am';
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    if (!invite) return;
    setSecondsLeft(45);
    try {
      playTickSound(700);
    } catch {}
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [invite]);

  if (!invite) return null;

  const isRps = invite.gameType === 'rps';
  const challengerName = invite.username || (isEN ? 'Opponent' : 'ተጋጣሚ');
  const initial = challengerName.charAt(0).toUpperCase();
  const gameName = isRps
    ? isEN ? 'Rock Paper Scissors' : 'ድንጋይ ወረቀት መቀስ'
    : isEN ? 'Tic-Tac-Toe' : 'XO ጨዋታ';

  return (
    <Modal visible={!!invite} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Subtle top-right dismiss */}
          <TouchableOpacity
            onPress={onDecline}
            style={s.closeBtn}
            activeOpacity={0.75}
            accessibilityLabel={isEN ? 'Close challenge' : 'ዝጋ'}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Overlapping Dual Avatars (Challenger + Game Icon) */}
          <View style={s.avatarPair}>
            <View style={s.challengerAvatar}>
              <Text style={s.challengerInitial}>{initial}</Text>
            </View>
            <View style={s.gameAvatar}>
              <Ionicons
                name={isRps ? 'hand-right-outline' : 'grid-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
          </View>

          {/* Centered Title & Concise 1-line Context */}
          <Text style={s.title} numberOfLines={1}>
            {isEN ? `${challengerName} challenges you` : `${challengerName} ጋብዞዎታል`}
          </Text>
          <Text style={s.subtitle} numberOfLines={2}>
            {isEN
              ? `${gameName} · ${Number(invite.amount || 0).toLocaleString()} ETB stake`
              : `${gameName} · ${Number(invite.amount || 0).toLocaleString()} ETB ውርርድ`}
          </Text>

          {/* Symmetric Pill Actions: Accept / Reject */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={s.acceptPill}
              onPress={() => {
                haptics.confirm();
                playTickSound(800);
                onAccept();
              }}
              accessibilityRole="button"
              accessibilityLabel={isEN ? 'Accept challenge' : 'ተቀበል'}
            >
              <Text style={s.acceptPillText}>{isEN ? 'Accept' : 'ተቀበል'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={s.rejectPill}
              onPress={() => {
                haptics.tap();
                playTickSound();
                onDecline();
              }}
              accessibilityRole="button"
              accessibilityLabel={isEN ? 'Reject challenge' : 'አትቀበል'}
            >
              <Text style={s.rejectPillText}>{isEN ? 'Reject' : 'አትቀበል'}</Text>
            </TouchableOpacity>
          </View>

          {/* Subtle Expiry Caption */}
          <Text style={s.footerNote}>
            {isEN ? `Expires in ${secondsLeft}s` : `በ ${secondsLeft} ሰከንድ ያበቃል`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 14, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  challengerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.cardRaised,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  challengerInitial: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  gameAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.tintPrimary,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    zIndex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  acceptPill: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptPillText: {
    color: colors.bgDeep,
    fontSize: 14,
    fontWeight: '800',
  },
  rejectPill: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectPillText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
});
