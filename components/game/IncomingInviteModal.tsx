// components/game/IncomingInviteModal.tsx — Styled matching Image 5 with XOET Brand Colors
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTickSound } from '../../lib/pinTickAudio';
import { haptics } from '../../lib/haptcs';

interface Props {
  invite: any; // { fromUserId, fromUsername, betAmount }
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingInviteModal({ invite, onAccept, onDecline }: Props) {
  useEffect(() => {
    if (invite) {
      try {
        playTickSound(700);
      } catch {}
    }
  }, [invite]);

  if (!invite) return null;

  return (
    <Modal visible={!!invite} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={s.overlay}>
        <View style={s.box}>
          {/* Header Row (Avatar + Name + Status Dot matching Image 5) */}
          <View style={s.header}>
            <View style={s.avatarWrap}>
              <View style={s.avatarCircle}>
                <Ionicons name="game-controller" size={22} color="#00daf3" />
              </View>
              <View style={s.onlineBadge} />
            </View>

            <View style={s.headerTextWrap}>
              <Text style={s.badgeLabel}>CHALLENGE REQUEST</Text>
              <Text style={s.title} numberOfLines={1}>{invite.username || 'Opponent'}</Text>
            </View>
          </View>

          {/* Invitation Details Body */}
          <View style={s.bodyCard}>
            <Text style={s.bodyText}>
              Wants to challenge you to a Tic-Tac-Toe match for{' '}
              <Text style={s.amountHighlight}>{invite.amount || 0} ETB</Text>.
            </Text>
          </View>

          {/* Actions: Decline and Accept Pills matching Image 5 */}
          <View style={s.actions}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[s.btn, s.btnDecline]}
              onPress={() => {
                haptics.tap();
                playTickSound();
                onDecline();
              }}
            >
              <Text style={s.btnDeclineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[s.btn, s.btnAccept]}
              onPress={() => {
                haptics.confirm();
                playTickSound(800);
                onAccept();
              }}
            >
              <Ionicons name="flash" size={16} color="#060a14" />
              <Text style={s.btnAcceptText}>Accept Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111625',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 218, 243, 0.25)',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 218, 243, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 218, 243, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#111625',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  badgeLabel: {
    color: '#8b93a7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
    marginTop: 2,
  },
  bodyCard: {
    backgroundColor: '#161c2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 18,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  amountHighlight: {
    color: '#00daf3',
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnDecline: {
    backgroundColor: '#161c2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnDeclineText: {
    color: '#8b93a7',
    fontSize: 14,
    fontWeight: '800',
  },
  btnAccept: {
    backgroundColor: '#00daf3',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnAcceptText: {
    color: '#060a14',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
